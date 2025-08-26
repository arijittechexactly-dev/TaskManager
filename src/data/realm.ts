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
  },
};

console.log(TaskSchema, 'TaskSchema');
let realmInstance: Realm | null = null;

export async function getRealm(): Promise<Realm> {
  if (realmInstance && !realmInstance.isClosed) return realmInstance;
  realmInstance = await Realm.open({schema: [TaskSchema], schemaVersion: 1});
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
