import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Pressable,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useAuth } from '../auth/AuthContext';
import { getRealm, newId, TaskRecord } from '../data/realm';
import { startTaskSync, stopTaskSync, flushPendingToRemote } from '../data/syncService';
import { scale as s, verticalScale as vs, moderateScale as ms } from 'react-native-size-matters';
import NotificationService from '../services/NotificationService';
import { useTheme } from '../theme';
import { useAppSelector } from '../store/hooks';
import type { RootState } from '../store';
import DatePickerModal from '../components/modals/DatePickerModal';
import TimePickerModal from '../components/modals/TimePickerModal';
import PriorityPickerModal from '../components/modals/PriorityPickerModal';
import MaterialIcons from '@react-native-vector-icons/material-icons';

type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low' | 'none';
  dueAt?: Date | null;
};

const HomeScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const notificationService = useMemo(() => NotificationService.getInstance(), []);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [priorityModalVisible, setPriorityModalVisible] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low' | 'none' | null>('none');
  const online = useAppSelector((state: RootState) => state.network.online);
  const pendingCount = useAppSelector((state: RootState) => state.sync.pendingCount);

  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // const greeting = useMemo(() => `Hello${user?.email ? `, ${user.email}` : ''} 👋`, [user?.email]);
  const greeting = useMemo(() => {
    const firstName = user?.email ? user.email.split('@')[0].split(/[._-]/)[0] : '';
    const name = firstName.charAt(0).toUpperCase() + firstName.slice(1);
    return `Hello${name ? `, ${name}` : ''} 👋`;
  }, [user?.email]);
  const remainingCount = tasks.filter(t => !t.completed).length;

  const openAdd = () => {
    setEditingTaskId(null);
    setInputValue('');
    setSelectedPriority('none');
    setSelectedDate(null);
    setSelectedTime(null);
    setModalVisible(true);
  };

  const handleOpenTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedTime ?? new Date(),
        mode: 'time',
        is24Hour: false,
        onChange: (_event, date) => {
          if (date) setSelectedTime(date);
        },
      });
      return;
    }
    setTimeModalVisible(true);
  };

  const handleOpenDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedDate ?? new Date(),
        mode: 'date',
        onChange: (_event, date) => {
          if (date) setSelectedDate(date);
        },
      });
      return;
    }
    setDateModalVisible(true);
  };
  const openEdit = async (task: Task) => {
    setEditingTaskId(task.id);
    setInputValue(task.title);
    try {
      const realm = await getRealm();
      const rec = realm.objectForPrimaryKey<TaskRecord>('Task', task.id);
      if (rec) {
        // Prefill priority and date/time
        const pr = (rec as any).priority as Task['priority'] | undefined;
        const due = (rec as any).dueAt as Date | undefined;
        setSelectedPriority(pr ?? 'none');
        if (due) {
          setSelectedDate(new Date(due));
          setSelectedTime(new Date(due));
        } else {
          setSelectedDate(null);
          setSelectedTime(null);
        }
      }
    } catch { }
    setModalVisible(true);
  };
  const closeModal = () => {
    setModalVisible(false);
    setInputValue('');
    setEditingTaskId(null);
  };

  const saveTask = async () => {
    const title = inputValue.trim();
    if (!title || !user?.uid) return;
    const buildDueAt = (): Date | null => {
      if (!selectedDate && !selectedTime) return null;
      const base = new Date(selectedDate ?? new Date());
      const time = selectedTime ?? null;
      if (time) {
        base.setHours(time.getHours(), time.getMinutes(), 0, 0);
      } else {
        base.setHours(0, 0, 0, 0);
      }
      return base;
    };
    const dueAt = buildDueAt();
    const realm = await getRealm();
    let taskId = editingTaskId || newId();

    realm.write(() => {
      if (editingTaskId) {
        const rec = realm.objectForPrimaryKey<TaskRecord>('Task', editingTaskId);
        if (rec) {
          rec.title = title;
          rec.updatedAt = new Date();
          rec.updatedAtMillis = Date.now();
          rec.dirty = true;
          rec.deleted = false;
          // @ts-ignore extend dynamic properties if schema has them
          (rec as any).priority = selectedPriority ?? 'none';
          // @ts-ignore
          (rec as any).dueAt = dueAt;
          console.log('[Realm] saveTask edit', { id: editingTaskId, title, dirty: rec.dirty, updatedAtMillis: rec.updatedAtMillis });
          taskId = editingTaskId;
        }
      } else {
        taskId = newId();
        realm.create<TaskRecord>('Task', {
          _id: taskId,
          userId: user.uid,
          title,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedAtMillis: Date.now(),
          dirty: true,
          deleted: false,
          // @ts-ignore
          priority: selectedPriority ?? 'none',
          // @ts-ignore
          dueAt,
        });
        console.log('[Realm] saveTask add', { title });
      }
    });
    setModalVisible(false);

    // Schedule notification if due date is set
    if (dueAt && taskId) {
      try {
        await notificationService.cancelTaskReminder(taskId); // Cancel any existing reminder
        await notificationService.scheduleTaskReminder(taskId, title, dueAt);
      } catch (error) {
        console.error('Failed to schedule notification:', error);
      }
    }

    // If already online, flush immediately so user doesn't need to reload
    if (online) {
      try { await flushPendingToRemote(); } catch { }
    }
  };

  const toggleTask = async (id: string) => {
    if (!user?.uid) return;
    const realm = await getRealm();
    let isCompleted = false;
    realm.write(() => {
      const rec = realm.objectForPrimaryKey<TaskRecord>('Task', id);
      if (rec) {
        isCompleted = !rec.completed;
        rec.completed = isCompleted;
        rec.updatedAt = new Date();
        rec.updatedAtMillis = Date.now();
        rec.dirty = true;
        console.log('[Realm] toggleTask', { id, completed: rec.completed, dirty: rec.dirty, updatedAtMillis: rec.updatedAtMillis });
      }
    });

    // If task is completed, cancel any scheduled notifications
    if (isCompleted) {
      try {
        await notificationService.cancelTaskReminder(id);
      } catch (error) {
        console.error('Failed to cancel notification:', error);
      }
    }

    if (online) {
      try { await flushPendingToRemote(); } catch { }
    }
  };

  const deleteTask = async (id: string) => {
    if (!user?.uid) return;
    const realm = await getRealm();
    realm.write(() => {
      const rec = realm.objectForPrimaryKey<TaskRecord>('Task', id);
      if (rec) {
        rec.deleted = true;
        rec.updatedAt = new Date();
        rec.updatedAtMillis = Date.now();
        rec.dirty = true;
        console.log('[Realm] deleteTask mark', { id, deleted: rec.deleted, dirty: rec.dirty });
      }
    });

    // Cancel any scheduled notification for this task
    try {
      await notificationService.cancelTaskReminder(id);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }

    if (online) {
      try { await flushPendingToRemote(); } catch { }
    }
  };

  const renderItem = ({ item }: { item: Task }) => (
    <View style={[styles.taskItem, item.completed && styles.taskItemDone]}
      accessibilityRole="button"
      accessibilityLabel={item.completed ? `Task ${item.title} completed` : `Task ${item.title} incomplete`}
    >
      <Pressable style={styles.checkbox} onPress={() => toggleTask(item.id)}>
        <MaterialIcons
          name={item.completed ? 'check-circle' : 'radio-button-unchecked'}
          size={24}
          color={item.completed ? colors.success : colors.muted}
        />
      </Pressable>
      <Pressable style={styles.taskTextWrap} onPress={() => toggleTask(item.id)}>
        <Text style={[styles.taskText, item.completed && styles.taskTextDone]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaBadgesRow}>
          {!!item.dueAt && (
            <View style={styles.badge}>
              <MaterialIcons name="event" size={14} color={colors.primary} />
              <Text style={styles.badgeText}>{new Date(item.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
            </View>
          )}
          {!!item.dueAt && (
            <View style={styles.badge}>
              <MaterialIcons name="schedule" size={14} color={colors.success} />
              <Text style={styles.badgeText}>{new Date(item.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          )}
          {item.priority && item.priority !== 'none' && (
            <View style={styles.badge}>
              <MaterialIcons
                name="flag"
                size={14}
                color={item.priority === 'high' ? colors.danger : item.priority === 'medium' ? colors.warning : colors.success}
              />
              <Text style={styles.badgeText}>{item.priority[0].toUpperCase() + item.priority.slice(1)}</Text>
            </View>
          )}
        </View>
      </Pressable>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
          <MaterialIcons name="edit" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => deleteTask(item.id)}>
          <MaterialIcons name="delete" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Request notification permissions and get FCM token when component mounts
  useEffect(() => {
    if (user?.uid) {
      const setupNotifications = async () => {
        try {
          // Request permissions
          await notificationService.requestPermission();

          // Get and log FCM token
          const fcmToken = await notificationService.getFCMToken();
          console.log('=== FCM Token ===');
          console.log(fcmToken);
          console.log('================');

          // Set up token refresh listener
          messaging().onTokenRefresh(token => {
            console.log('=== New FCM Token ===');
            console.log(token);
            console.log('===================');
          });
        } catch (error) {
          console.error('Failed to setup notifications:', error);
        }
      };

      setupNotifications();
    }
  }, [user?.uid, notificationService]);

  useEffect(() => {
    let results: any | null = null;
    let realmClosed = false;

    const attach = async () => {
      if (!user?.uid) {
        setTasks([]);
        stopTaskSync();
        return;
      }
      const realm = await getRealm();
      if (realmClosed) return;
      // Start online sync service
      console.log('[Sync] startTaskSync', { userId: user.uid });
      startTaskSync(user.uid);
      results = realm.objects<TaskRecord>('Task').filtered('userId == $0 AND deleted == false', user.uid);
      const update = () => {
        const mapped: Task[] = results.map((r: any) => ({
          id: r._id,
          title: r.title,
          completed: r.completed,
          priority: r.priority ?? 'none',
          dueAt: r.dueAt ?? null,
        }));
        setTasks(mapped);
        console.log('[Realm] subscription update -> UI', { count: mapped.length, first: mapped[0] });
      };
      update();
      results.addListener(update);
    };

    attach();
    return () => {
      try {
        results?.removeAllListeners?.();
      } catch { }
      realmClosed = true;
    };
  }, [user?.uid]);

  // Global listeners now handle online and pending count

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={styles.accentTopRight} />
      <View style={styles.accentBottomLeft} />

      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoCircle}>
            <MaterialIcons name="task-alt" size={20} color={colors.primary} />
          </View>
          <Text style={styles.brand}>TaskManager</Text>
        </View>
        <View style={styles.rightRow}>
          <View style={styles.statusBadge} accessibilityLabel={`Status ${online ? 'online' : 'offline'}, pending ${pendingCount}`}>
            <View style={[styles.statusDot, online ? styles.statusDotOnline : styles.statusDotOffline]} />
            <Text style={styles.statusText}>
              {online ? 'Online' : 'Offline'}{pendingCount > 0 ? ` • ${pendingCount}` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <MaterialIcons name="logout" size={18} color={colors.danger} />
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.ribbon} />
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.subtitle}>{remainingCount === 0 ? 'All tasks done. Great job!' : `${remainingCount} task${remainingCount > 1 ? 's' : ''} remaining`}</Text>

        <FlatList
          data={tasks}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialIcons name="inbox" size={36} color="#9ca3af" />
              <Text style={styles.emptyText}>No tasks yet. Tap + to add one.</Text>
            </View>
          }
          contentContainerStyle={tasks.length === 0 ? styles.listEmptyContainer : undefined}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <TouchableOpacity style={styles.fab} onPress={openAdd} accessibilityLabel="Add task">
        <MaterialIcons name="add" size={28} color="white" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingTaskId ? 'Edit Task' : 'New Task'}</Text>
            <TextInput
              placeholder="What do you need to do?"
              value={inputValue}
              onChangeText={setInputValue}
              style={styles.modalInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveTask}
            />
            <View style={styles.metaRow}>
              <TouchableOpacity style={styles.metaIconBtn} accessibilityLabel="Pick due date" onPress={handleOpenDatePicker}>
                <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
                <Text style={styles.metaIconLabel}>{selectedDate ? selectedDate.toDateString() : 'Date'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.metaIconBtn} accessibilityLabel="Set priority" onPress={() => setPriorityModalVisible(true)}>
                <MaterialIcons name="flag" size={20} color={selectedPriority === 'high' ? colors.danger : selectedPriority === 'medium' ? colors.warning : selectedPriority === 'low' ? colors.success : selectedPriority === 'none' ? colors.muted : colors.danger} />
                <Text style={styles.metaIconLabel}>{selectedPriority ? selectedPriority[0].toUpperCase() + selectedPriority.slice(1) : 'Priority'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.metaIconBtn} accessibilityLabel="Set time" onPress={handleOpenTimePicker}>
                <MaterialIcons name="access-time" size={20} color={colors.success} />
                <Text style={styles.metaIconLabel}>{selectedTime ? selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={closeModal}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalSave]} onPress={saveTask}>
                <Text style={[styles.modalBtnText, styles.modalSaveText]}>{editingTaskId ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker (iOS only modal) */}
      {Platform.OS === 'ios' && (
        <DatePickerModal
          visible={dateModalVisible}
          value={selectedDate}
          onChange={(d) => setSelectedDate(d)}
          onRequestClose={() => setDateModalVisible(false)}
          title="Select Due Date"
        />
      )}

      {/* Time Picker (iOS only modal) */}
      {Platform.OS === 'ios' && (
        <TimePickerModal
          visible={timeModalVisible}
          value={selectedTime}
          onChange={(d) => setSelectedTime(d)}
          onRequestClose={() => setTimeModalVisible(false)}
          title="Select Time"
        />
      )}

      {/* Priority Picker Modal */}
      <PriorityPickerModal
        visible={priorityModalVisible}
        selected={(selectedPriority ?? 'none') as 'high' | 'medium' | 'low' | 'none'}
        onSelect={(p) => { setSelectedPriority(p); setPriorityModalVisible(false); }}
        onRequestClose={() => setPriorityModalVisible(false)}
      />
    </View>
  );
};

// Screen-based sizing
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACCENT_TR_SIZE = SCREEN_WIDTH * 0.48;
const ACCENT_BL_SIZE = SCREEN_WIDTH * 0.56;

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, padding: ms(20), backgroundColor: colors.background },
    accentTopRight: { position: 'absolute', top: -vs(50), right: -s(30), height: ACCENT_TR_SIZE, width: ACCENT_TR_SIZE, borderRadius: ACCENT_TR_SIZE / 2, backgroundColor: colors.accent, opacity: 0.25 },
    accentBottomLeft: { position: 'absolute', bottom: -vs(40), left: -s(40), height: ACCENT_BL_SIZE, width: ACCENT_BL_SIZE, borderRadius: ACCENT_BL_SIZE / 2, backgroundColor: colors.accent, opacity: 0.2 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: ms(12) },
    brandRow: { flexDirection: 'row', alignItems: 'center' },
    logoCircle: { height: ms(32), width: ms(32), borderRadius: ms(16), backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', marginRight: s(8) },
    brand: { fontWeight: '800', color: colors.primary, letterSpacing: 0.3, fontSize: ms(14) },
    rightRow: { flexDirection: 'row', alignItems: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: s(8), paddingVertical: vs(4), borderRadius: ms(12), borderWidth: 1, borderColor: colors.border, marginRight: s(8) },
    statusDot: { width: ms(8), height: ms(8), borderRadius: ms(4), marginRight: s(6) },
    statusDotOnline: { backgroundColor: colors.success },
    statusDotOffline: { backgroundColor: colors.muted },
    statusText: { color: colors.textSecondary, fontWeight: '700', fontSize: ms(11) },
    signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: s(6), backgroundColor: colors.surface, paddingHorizontal: s(10), paddingVertical: vs(6), borderRadius: ms(10), shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
    signOutText: { color: colors.danger, fontWeight: '700', marginLeft: s(6), fontSize: ms(12) },

    card: { flex: 1, backgroundColor: colors.surface, borderRadius: ms(20), padding: ms(16), shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16 },
    ribbon: { height: vs(6), backgroundColor: colors.accent, borderRadius: ms(6), width: s(84), alignSelf: 'center', marginBottom: vs(10) },
    greeting: { fontSize: ms(22), fontWeight: '800', color: colors.textPrimary },
    subtitle: { fontSize: ms(14), color: colors.textSecondary, marginTop: vs(4), marginBottom: vs(12) },

    listEmptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
    emptyWrap: { alignItems: 'center', gap: vs(6) },
    emptyText: { color: colors.textSecondary, fontSize: ms(13) },

    taskItem: { flexDirection: 'row', paddingVertical: vs(12), paddingHorizontal: s(12), borderRadius: ms(14), backgroundColor: colors.surface, marginBottom: vs(10), borderWidth: 1, borderColor: colors.border },
    taskItemDone: { backgroundColor: colors.surface, borderColor: colors.success },
    checkbox: { marginRight: s(10) },
    taskTextWrap: { flex: 1 },
    taskText: { color: colors.textPrimary, fontSize: ms(14) },
    taskTextDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
    metaBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s(6), marginTop: vs(6) },
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.badgeBg, paddingVertical: vs(4), paddingHorizontal: s(8), borderRadius: ms(999), borderWidth: 1, borderColor: colors.border },
    badgeText: { marginLeft: s(4), color: colors.textSecondary, fontWeight: '700', fontSize: ms(11) },
    actions: { flexDirection: 'row', marginLeft: s(8), alignSelf: 'flex-start' },
    iconBtn: { padding: s(6), marginLeft: s(4), borderRadius: ms(10), backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },

    fab: { position: 'absolute', right: s(20), bottom: vs(24), height: ms(56), width: ms(56), borderRadius: ms(28), backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 6 },

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.surface, padding: ms(16), borderTopLeftRadius: ms(20), borderTopRightRadius: ms(20) },
    modalTitle: { fontSize: ms(18), fontWeight: '800', marginBottom: vs(10), color: colors.textPrimary },
    modalInput: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.badgeBg, borderRadius: ms(12), padding: ms(12) },
    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: vs(10), marginBottom: vs(4) },
    metaIconBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: vs(8), paddingHorizontal: s(12), borderRadius: ms(12), shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
    metaIconLabel: { marginLeft: s(8), color: colors.textSecondary, fontWeight: '700', fontSize: ms(12) },
    priorityList: { marginTop: vs(4) },
    priorityOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.badgeBg, borderWidth: 1, borderColor: colors.border, paddingVertical: vs(10), paddingHorizontal: s(12), borderRadius: ms(12), marginBottom: vs(8) },
    priorityLabel: { marginLeft: s(10), fontWeight: '800', fontSize: ms(13) },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: vs(12) },
    modalBtn: { paddingVertical: vs(10), paddingHorizontal: s(14), borderRadius: ms(10) },
    modalCancel: { backgroundColor: colors.badgeBg, marginRight: s(8) },
    modalSave: { backgroundColor: colors.primary },
    modalBtnText: { fontWeight: '700', color: colors.textPrimary, fontSize: ms(13) },
    modalSaveText: { color: 'white' },
  });
}

export default HomeScreen;
