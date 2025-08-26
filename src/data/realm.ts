import Realm, {ObjectSchema} from 'realm';

export type TaskRecord = {
  _id: string;
  userId: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedAtMillis: number; // for conflict resolution
  dirty: boolean; // needs sync to Firestore
  deleted: boolean; // soft delete for offline
  // New optional fields for richer task metadata
  priority?: 'high' | 'medium' | 'low' | 'none';
  dueAt?: Date | null;
};

const TaskSchema: ObjectSchema = {
  name: 'Task',
  primaryKey: '_id',
  properties: {
    _id: 'string',
    userId: 'string',
    title: 'string',
    completed: {type: 'bool', default: false},
    createdAt: 'date',
    updatedAt: 'date',
    updatedAtMillis: {type: 'int', default: 0},
    dirty: {type: 'bool', default: false},
    deleted: {type: 'bool', default: false},
    priority: {type: 'string', default: 'none', optional: true},
    dueAt: {type: 'date', optional: true},
  },
};

console.log(TaskSchema, 'TaskSchema');
let realmInstance: Realm | null = null;

export async function getRealm(): Promise<Realm> {
  if (realmInstance && !realmInstance.isClosed) return realmInstance;
  realmInstance = await Realm.open({
    schema: [TaskSchema],
    schemaVersion: 2,
    onMigration: (oldRealm: Realm, newRealm: Realm) => {
      if (oldRealm.schemaVersion < 2) {
        const newObjects = newRealm.objects<any>('Task');
        for (let i = 0; i < newObjects.length; i++) {
          if (newObjects[i].priority === undefined) newObjects[i].priority = 'none';
          if (newObjects[i].dueAt === undefined) newObjects[i].dueAt = null;
        }
      }
    },
  });
  return realmInstance;
}

export function closeRealm() {
  if (realmInstance && !realmInstance.isClosed) {
    realmInstance.close();
    realmInstance = null;
  }
}

export function newId() {
  return Math.random().toString(36).slice(2);
}
