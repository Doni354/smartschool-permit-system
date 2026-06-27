import { db, collection, addDoc, query, where, getDocs, getDoc, doc, deleteDoc, updateDoc, orderBy, limit, onSnapshot } from '../firebase';
import { StudentPermit, PermitType, PermitStatus, User } from '../types';

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
    const q = query(
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

/**
 * Optimized: Fetch permits filtered by Tahun Ajaran at Firestore query level.
 * Reduces reads from ~900 to ~200-300.
 * Requires composite index: schoolId (ASC) + tahunAjaran (ASC) + timestamp (DESC)
 */
export const getPermitsBySchoolTA = async (schoolId: string, tahunAjaran: string): Promise<StudentPermit[]> => {
  try {
    const q = query(
      collection(db, PERMITS_COLLECTION),
      where('schoolId', '==', schoolId),
      where('tahunAjaran', '==', tahunAjaran),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentPermit));
  } catch (error) {
    console.warn("getPermitsBySchoolTA failed, falling back to full fetch", error);
    // Fallback: fetch all and filter client-side (in case index is not yet created)
    const all = await getPermitsBySchool(schoolId);
    return all.filter(p => (p.tahunAjaran || '') === tahunAjaran);
  }
};

/**
 * Optimized: Fetch only student names for autocomplete.
 * Caps at 200 most recent docs to minimize reads.
 */
export const getStudentNamesBySchool = async (schoolId: string): Promise<string[]> => {
  try {
    const q = query(
      collection(db, PERMITS_COLLECTION),
      where('schoolId', '==', schoolId),
      orderBy('timestamp', 'desc'),
      limit(200)
    );
    const snapshot = await getDocs(q);
    const names = new Set<string>();
    snapshot.docs.forEach(doc => {
      const name = doc.data().studentName;
      if (name) names.add(name);
    });
    return Array.from(names).sort();
  } catch (error) {
    console.warn("getStudentNamesBySchool failed", error);
    return [];
  }
};

/**
 * Real-time listener for permits by school + tahun ajaran.
 * Returns an unsubscribe function. Avoids re-fetching after mutations.
 */
export const onPermitsSnapshot = (
  schoolId: string,
  tahunAjaran: string,
  callback: (permits: StudentPermit[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const q = query(
    collection(db, PERMITS_COLLECTION),
    where('schoolId', '==', schoolId),
    where('tahunAjaran', '==', tahunAjaran),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q,
    (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentPermit));
      callback(data);
    },
    (error) => {
      console.error("onPermitsSnapshot error:", error);
      if (onError) onError(error as Error);
    }
  );
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

/**
 * Approve a permit request.
 * Sets status to APPROVED with approver info and timestamp.
 */
export const approvePermit = async (permitId: string, approver: User, isSuperAdmin: boolean = false): Promise<void> => {
  const approvalData = {
    status: PermitStatus.APPROVED,
    approvedBy: approver.name,
    approvedById: approver.id,
    approvedAt: Date.now(),
    isSuperAdminApproved: isSuperAdmin,
  };

  try {
    const docRef = doc(db, PERMITS_COLLECTION, permitId);
    await updateDoc(docRef, approvalData);
  } catch (error) {
    console.error("Error approving permit:", error);
    // Fallback local storage logic...
    if (permitId.startsWith('local_')) {
      const stored = JSON.parse(localStorage.getItem(PERMITS_COLLECTION) || '[]');
      const index = stored.findIndex((p: any) => p.id === permitId);
      if (index !== -1) {
        stored[index] = { ...stored[index], ...approvalData };
        localStorage.setItem(PERMITS_COLLECTION, JSON.stringify(stored));
      }
    }
    throw error;
  }
};