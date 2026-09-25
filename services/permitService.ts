import { db, collection, addDoc, query, where, getDocs, getDoc, doc, deleteDoc, updateDoc, orderBy, limit, onSnapshot } from '../firebase';
import { StudentPermit, PermitType, PermitStatus, User } from '../types';

const PERMITS_COLLECTION = 'permits';

// Fallback to localStorage if Firebase fails (due to rules/network)
const useLocalStorageFallback = true;

/**
 * Simple in-memory cache with TTL to reduce Firestore reads.
 * Shared across the module — survives component re-renders but resets on full page reload.
 */
class MemoryCache<T> {
  private cache = new Map<string, { data: T; expiresAt: number }>();

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  /** Invalidate a specific key or all keys matching a prefix */
  invalidate(keyOrPrefix?: string): void {
    if (!keyOrPrefix) {
      this.cache.clear();
      return;
    }
    for (const k of this.cache.keys()) {
      if (k === keyOrPrefix || k.startsWith(keyOrPrefix + ':')) {
        this.cache.delete(k);
      }
    }
  }
}

// Cache instances
const namesCache = new MemoryCache<string[]>();       // student names autocomplete
const permitsCache = new MemoryCache<StudentPermit[]>(); // permits by school+TA (public pages)


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
    // Invalidate caches setelah create baru
    namesCache.invalidate();
    permitsCache.invalidate();
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

/**
 * @deprecated JANGAN PAKAI — Query ini membaca SEMUA docs tanpa filter tahunAjaran.
 * Gunakan getPermitsBySchoolTA() sebagai gantinya.
 * Fungsi ini tetap dipertahankan hanya untuk kompatibilitas,
 * tapi sudah TIDAK dipakai di manapun.
 */
export const getPermitsBySchool = async (schoolId: string, type?: PermitType): Promise<StudentPermit[]> => {
  console.warn('[PERF WARNING] getPermitsBySchool() dipanggil — fungsi ini membaca SEMUA docs! Gunakan getPermitsBySchoolTA() sebagai gantinya.');
  try {
    const q = query(
      collection(db, PERMITS_COLLECTION),
      where('schoolId', '==', schoolId)
    );
    
    const snapshot = await getDocs(q);
    let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentPermit));
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
 *
 * Uses in-memory cache (5 min TTL) for public pages to prevent repeated reads.
 */
export const getPermitsBySchoolTA = async (schoolId: string, tahunAjaran: string): Promise<StudentPermit[]> => {
  const cacheKey = `${schoolId}:${tahunAjaran}`;

  // Check cache first (5 min TTL)
  const cached = permitsCache.get(cacheKey);
  if (cached) return cached;

  try {
    const q = query(
      collection(db, PERMITS_COLLECTION),
      where('schoolId', '==', schoolId),
      where('tahunAjaran', '==', tahunAjaran),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentPermit));

    // Cache for 5 minutes
    permitsCache.set(cacheKey, data, 5 * 60 * 1000);
    return data;
  } catch (error) {
    console.warn("getPermitsBySchoolTA failed:", error);
    // TIDAK fallback ke getPermitsBySchool() yang baca ALL data.
    // Pastikan composite index sudah dibuat di Firestore!
    // Index: permits → schoolId (ASC) + tahunAjaran (ASC) + timestamp (DESC)
    return [];
  }
};

/**
 * Optimized: Fetch only student names for autocomplete.
 * - Limit diturunkan dari 200 → 50 docs (hemat 75% reads per call)
 * - In-memory cache 10 menit (hemat ~95% reads dari halaman publik)
 * 
 * 50 docs terbaru biasanya sudah mengcover sebagian besar nama aktif.
 */
export const getStudentNamesBySchool = async (schoolId: string): Promise<string[]> => {
  const cacheKey = `names:${schoolId}`;

  // Check cache first (10 min TTL)
  const cached = namesCache.get(cacheKey);
  if (cached) return cached;

  try {
    const q = query(
      collection(db, PERMITS_COLLECTION),
      where('schoolId', '==', schoolId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const names = new Set<string>();
    snapshot.docs.forEach(doc => {
      const name = doc.data().studentName;
      if (name) names.add(name);
    });
    const result = Array.from(names).sort();

    // Cache for 10 minutes
    namesCache.set(cacheKey, result, 10 * 60 * 1000);
    return result;
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
    // Invalidate caches setelah delete
    permitsCache.invalidate();
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
    // Invalidate caches setelah update
    permitsCache.invalidate();
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