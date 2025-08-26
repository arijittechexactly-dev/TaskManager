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
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useAuth } from '../auth/AuthContext';
import { getRealm, newId, TaskRecord } from '../data/realm';
import { startTaskSync, stopTaskSync } from '../data/syncService';
import { scale as s, verticalScale as vs, moderateScale as ms } from 'react-native-size-matters';

type Task = {
  id: string;
  title: string;
  completed: boolean;
};

const HomeScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  const greeting = useMemo(() => `Hello${user?.email ? `, ${user.email}` : ''} 👋`, [user?.email]);
  const remainingCount = tasks.filter(t => !t.completed).length;

  const openAdd = () => {
    setEditingTaskId(null);
    setInputValue('');
    setModalVisible(true);
  };
  const openEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setInputValue(task.title);
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
    const realm = await getRealm();
    realm.write(() => {
      if (editingTaskId) {
        const rec = realm.objectForPrimaryKey<TaskRecord>('Task', editingTaskId);
        if (rec) {
          rec.title = title;
          rec.updatedAt = new Date();
          rec.updatedAtMillis = Date.now();
          rec.dirty = true;
          rec.deleted = false;
          console.log('[Realm] saveTask edit', { id: editingTaskId, title, dirty: rec.dirty, updatedAtMillis: rec.updatedAtMillis });
        }
      } else {
        realm.create<TaskRecord>('Task', {
          _id: newId(),
          userId: user.uid,
          title,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedAtMillis: Date.now(),
          dirty: true,
          deleted: false,
        });
        console.log('[Realm] saveTask add', { title });
      }
    });
    setModalVisible(false);
  };

  const toggleTask = async (id: string) => {
    if (!user?.uid) return;
    const realm = await getRealm();
    realm.write(() => {
      const rec = realm.objectForPrimaryKey<TaskRecord>('Task', id);
      if (rec) {
        rec.completed = !rec.completed;
        rec.updatedAt = new Date();
        rec.updatedAtMillis = Date.now();
        rec.dirty = true;
        console.log('[Realm] toggleTask', { id, completed: rec.completed, dirty: rec.dirty, updatedAtMillis: rec.updatedAtMillis });
      }
    });
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
          color={item.completed ? '#16a34a' : '#9ca3af'}
        />
      </Pressable>
      <Pressable style={styles.taskTextWrap} onPress={() => toggleTask(item.id)}>
        <Text style={[styles.taskText, item.completed && styles.taskTextDone]} numberOfLines={2}>
          {item.title}
        </Text>
      </Pressable>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
          <MaterialIcons name="edit" size={20} color="#4f46e5" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => deleteTask(item.id)}>
          <MaterialIcons name="delete" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

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
        const mapped: Task[] = results.map((r: TaskRecord) => ({ id: r._id, title: r.title, completed: r.completed }));
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#eef2ff" />
      <View style={styles.accentTopRight} />
      <View style={styles.accentBottomLeft} />

      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoCircle}>
            <MaterialIcons name="task-alt" size={20} color="#4f46e5" />
          </View>
          <Text style={styles.brand}>TaskManager</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <MaterialIcons name="logout" size={18} color="#ef4444" />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
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
    </View>
  );
};

// Screen-based sizing
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACCENT_TR_SIZE = SCREEN_WIDTH * 0.48;
const ACCENT_BL_SIZE = SCREEN_WIDTH * 0.56;

const styles = StyleSheet.create({
  container: { flex: 1, padding: ms(20), backgroundColor: '#eef2ff' },
  accentTopRight: { position: 'absolute', top: -vs(50), right: -s(30), height: ACCENT_TR_SIZE, width: ACCENT_TR_SIZE, borderRadius: ACCENT_TR_SIZE / 2, backgroundColor: '#ddd6fe', opacity: 0.5 },
  accentBottomLeft: { position: 'absolute', bottom: -vs(40), left: -s(40), height: ACCENT_BL_SIZE, width: ACCENT_BL_SIZE, borderRadius: ACCENT_BL_SIZE / 2, backgroundColor: '#bae6fd', opacity: 0.45 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: ms(12) },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: { height: ms(32), width: ms(32), borderRadius: ms(16), backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginRight: s(8) },
  brand: { fontWeight: '800', color: '#4f46e5', letterSpacing: 0.3, fontSize: ms(14) },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: s(6), backgroundColor: 'white', paddingHorizontal: s(10), paddingVertical: vs(6), borderRadius: ms(10), shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  signOutText: { color: '#ef4444', fontWeight: '700', marginLeft: s(6), fontSize: ms(12) },

  card: { flex: 1, backgroundColor: 'white', borderRadius: ms(20), padding: ms(16), shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16 },
  ribbon: { height: vs(6), backgroundColor: '#a78bfa', borderRadius: ms(6), width: s(84), alignSelf: 'center', marginBottom: vs(10) },
  greeting: { fontSize: ms(22), fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: ms(14), color: '#6b7280', marginTop: vs(4), marginBottom: vs(12) },

  listEmptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { alignItems: 'center', gap: vs(6) },
  emptyText: { color: '#6b7280', fontSize: ms(13) },

  taskItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(12), paddingHorizontal: s(12), borderRadius: ms(14), backgroundColor: '#f8fafc', marginBottom: vs(10), borderWidth: 1, borderColor: '#e5e7eb' },
  taskItemDone: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  checkbox: { marginRight: s(10) },
  taskTextWrap: { flex: 1 },
  taskText: { color: '#111827', fontSize: ms(14) },
  taskTextDone: { color: '#6b7280', textDecorationLine: 'line-through' },
  actions: { flexDirection: 'row', marginLeft: s(8) },
  iconBtn: { padding: s(6), marginLeft: s(4), borderRadius: ms(10), backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },

  fab: { position: 'absolute', right: s(20), bottom: vs(24), height: ms(56), width: ms(56), borderRadius: ms(28), backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 6 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', padding: ms(16), borderTopLeftRadius: ms(20), borderTopRightRadius: ms(20) },
  modalTitle: { fontSize: ms(18), fontWeight: '800', marginBottom: vs(10), color: '#111827' },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', borderRadius: ms(12), padding: ms(12) },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: vs(12) },
  modalBtn: { paddingVertical: vs(10), paddingHorizontal: s(14), borderRadius: ms(10) },
  modalCancel: { backgroundColor: '#f3f4f6', marginRight: s(8) },
  modalSave: { backgroundColor: '#4f46e5' },
  modalBtnText: { fontWeight: '700', color: '#111827', fontSize: ms(13) },
  modalSaveText: { color: 'white' },
});

export default HomeScreen;
