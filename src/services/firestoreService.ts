import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  getDocs,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Service methods
export const fairsService = {
  subscribeToFairs: (callback: (fairs: any[]) => void) => {
    const q = query(collection(db, 'fairs'));
    return onSnapshot(q, (snapshot) => {
      const fairs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(fairs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'fairs'));
  },

  createFair: async (data: any) => {
    try {
      return await addDoc(collection(db, 'fairs'), {
        ...data,
        createdAt: Timestamp.now(),
        organizerId: auth.currentUser?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'fairs');
    }
  }
};

export const projectsService = {
  subscribeToProjects: (callback: (projects: any[]) => void) => {
    const q = query(collection(db, 'projects'));
    return onSnapshot(q, (snapshot) => {
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(projects);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));
  }
};
