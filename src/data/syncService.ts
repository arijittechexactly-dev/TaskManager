import NetInfo, {NetInfoState} from '@react-native-community/netinfo';
import firestore from '@react-native-firebase/firestore';
import {getRealm, TaskRecord} from './realm';
import Realm from 'realm';

let unsubscribeNetInfo: (() => void) | null = null;
let unsubscribeRemote: (() => void) | null = null;
let currentUserId: string | null = null;

export async function startTaskSync(userId: string) {
  currentUserId = userId;
  const realm = await getRealm();

  // Remote -> Local subscription (when online)
  const attachRemoteListener = () => {
    if (!currentUserId) return;
    unsubscribeRemote?.();
    unsubscribeRemote = firestore()
      .collection('users')
      .doc(currentUserId)
      .collection('tasks')
      .onSnapshot(async snap => {
        const realmInstance = await getRealm();
        realmInstance.write(() => {
          snap.docChanges().forEach(change => {
            const id = change.doc.id;
            const data = change.doc.data();
            const existing = realmInstance.objectForPrimaryKey<TaskRecord>(
              'Task',
              id,
            );
            const remoteUpdatedAt = (data.updatedAt?.toMillis?.() ??
              0) as number;
            if (change.type === 'removed') {
              // If remote removed, mark local as deleted (or delete if not dirty)
              if (existing && !existing.dirty) {
                realmInstance.delete(existing);
              } else if (existing) {
                existing.deleted = true;
              }
              return;
            }
            // Upsert with conflict resolution: pick the newer updatedAtMillis
            if (!existing) {
              realmInstance.create<TaskRecord>(
                'Task',
                {
                  _id: id,
                  userId: currentUserId!,
                  title: String(data.title ?? ''),
                  completed: Boolean(data.completed ?? false),
                  createdAt: data.createdAt?.toDate?.() ?? new Date(),
                  updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
                  updatedAtMillis: remoteUpdatedAt,
                  dirty: false,
                  deleted: false,
                },
                Realm.UpdateMode.Modified,
              );
            } else if (remoteUpdatedAt > existing.updatedAtMillis) {
              existing.title = String(data.title ?? existing.title);
              existing.completed = Boolean(
                data.completed ?? existing.completed,
              );
              existing.updatedAt = data.updatedAt?.toDate?.() ?? new Date();
              existing.updatedAtMillis = remoteUpdatedAt;
              existing.deleted = false;
              existing.dirty = false; // remote wins
            }
          });
        });
      });
  };

  // Connectivity listener: when online, try syncing and attach remote listener
  unsubscribeNetInfo?.();
  unsubscribeNetInfo = NetInfo.addEventListener(async (state: NetInfoState) => {
    const online = Boolean(state.isConnected && state.isInternetReachable);
    if (online) {
      await flushPendingToRemote();
      attachRemoteListener();
    }
  });

  // Initial attempt
  const net = await NetInfo.fetch();
  if (net.isConnected && net.isInternetReachable) {
    await flushPendingToRemote();
    attachRemoteListener();
  }
}

export function stopTaskSync() {
  unsubscribeNetInfo?.();
  unsubscribeNetInfo = null;
  unsubscribeRemote?.();
  unsubscribeRemote = null;
  currentUserId = null;
}

export async function flushPendingToRemote() {
  if (!currentUserId) return;
  const realm = await getRealm();
  const dirty = realm
    .objects<TaskRecord>('Task')
    .filtered('userId == $0 AND dirty == true', currentUserId);

  const batch = firestore().batch();
  const col = firestore()
    .collection('users')
    .doc(currentUserId)
    .collection('tasks');

  // Prepare batch
  dirty.forEach((t: TaskRecord) => {
    const ref = col.doc(t._id);
    if (t.deleted) {
      batch.delete(ref);
    } else {
      batch.set(
        ref,
        {
          title: t.title,
          completed: t.completed,
          // Preserve the original creation time from local storage; do not overwrite on updates
          createdAt: t.createdAt,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        {merge: true},
      );
    }
  });

  if (!dirty.length) return;

  await batch.commit();

  // Mark as clean
  realm.write(() => {
    dirty.forEach((t: TaskRecord) => {
      if (t.deleted) {
        realm.delete(t);
      } else {
        t.dirty = false;
        // updatedAtMillis will be updated by remote listener after commit
      }
    });
  });
}
