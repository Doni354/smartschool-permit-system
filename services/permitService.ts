import { db, collection, addDoc, query, where, getDocs, getDoc, doc, deleteDoc, updateDoc } from '../firebase';
import { StudentPermit, PermitType } from '../types';

const PERMITS_COLLECTION = 'permits';

// Fallback to localStorage if Firebase fails (due to rules/network)
const useLocalStorageFallback = true; 


export const getPermitById = async (id: string): Promise<StudentPermit | null> => {
  try {
    // Check if it's a local ID
    if (id.startsWith('local_')) {
      if (useLocalStorageFallback) {
        const stored = JSON.parse(localStorage.getItem(PERMITS_COLLECTION) || '[]');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return stored.find((p: any) => p.id === id) || null;
      }
      return null;
    }

    const docRef = doc(db, PERMITS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as StudentPermit;
    } else {
      return null;
    }
  } catch (error) {
    console.warn("Firebase read failed, using local storage fallback", error);
    if (useLocalStorageFallback) {
      const stored = JSON.parse(localStorage.getItem(PERMITS_COLLECTION) || '[]');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return stored.find((p: any) => p.id === id) || null;
    }
    return null;
  }
};

export const createPermit = async (permit: Omit<StudentPermit, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, PERMITS_COLLECTION), {
      ...permit,
      createdAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.warn("Firebase write failed, using local storage fallback", error);
    if (useLocalStorageFallback) {
      const id = 'local_' + Date.now();
      const stored = JSON.parse(localStorage.getItem(PERMITS_COLLECTION) || '[]');
      stored.push({ ...permit, id });
      localStorage.setItem(PERMITS_COLLECTION, JSON.stringify(stored));
      return id;
    }
    throw error;
  }
};

export const getPermitsBySchool = async (schoolId: string, type?: PermitType): Promise<StudentPermit[]> => {
  try {
    // Try to order by timestamp desc in query, might require index in Firestore
    let q = query(
      collection(db, PERMITS_COLLECTION),
      where('schoolId', '==', schoolId)
    );
    
    const snapshot = await getDocs(q);
    let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentPermit));

    // Client side sorting to ensure correct order regardless of index
    data.sort((a, b) => b.timestamp - a.timestamp);

    if (type) {
      data = data.filter(p => p.type === type);
    }
    return data;
  } catch (error) {
    console.warn("Firebase read failed, using local storage fallback", error);
    if (useLocalStorageFallback) {
      const stored = JSON.parse(localStorage.getItem(PERMITS_COLLECTION) || '[]');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data = stored.filter((p: any) => p.schoolId === schoolId);
      if (type) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data = data.filter((p: any) => p.type === type);
      }
      // Sort desc
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.sort((a: any, b: any) => b.timestamp - a.timestamp);
    }
    return [];
  }
};

export const deletePermit = async (id: string): Promise<void> => {
  try {
    // Check if it's a local ID
    if (id.startsWith('local_')) {
      if (useLocalStorageFallback) {
        const stored = JSON.parse(localStorage.getItem(PERMITS_COLLECTION) || '[]');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newStored = stored.filter((p: any) => p.id !== id);
        localStorage.setItem(PERMITS_COLLECTION, JSON.stringify(newStored));
      }
      return;
    }

    await deleteDoc(doc(db, PERMITS_COLLECTION, id));
  } catch (error) {
    console.error("Error deleting permit:", error);
    throw error;
  }
};

export const updatePermit = async (id: string, data: Partial<StudentPermit>): Promise<void> => {
  try {
     // Check if it's a local ID
     if (id.startsWith('local_')) {
      if (useLocalStorageFallback) {
        const stored = JSON.parse(localStorage.getItem(PERMITS_COLLECTION) || '[]');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const index = stored.findIndex((p: any) => p.id === id);
        if (index !== -1) {
          stored[index] = { ...stored[index], ...data };
          localStorage.setItem(PERMITS_COLLECTION, JSON.stringify(stored));
        }
      }
      return;
    }

    await updateDoc(doc(db, PERMITS_COLLECTION, id), data);
  } catch (error) {
    console.error("Error updating permit:", error);
    throw error;
  }
};