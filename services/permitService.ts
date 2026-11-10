import { db, collection, addDoc, query, where, getDocs, getDoc, getCountFromServer, doc, deleteDoc, updateDoc, orderBy, limit, onSnapshot } from '../firebase';
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

// LocalStorage & SessionStorage cache constants
const NAMES_LOCAL_STORAGE_PREFIX = 'smartschool_names_';
const NAMES_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam (persists across tab closures / HP reloads)
const PERMITS_SESSION_PREFIX = 'smartschool_ta_permits_';
const PERMITS_SESSION_TTL_MS = 10 * 60 * 1000;   // 10 menit

function getLocalNames(schoolId: string): string[] | null {
  try {
    const raw = localStorage.getItem(NAMES_LOCAL_STORAGE_PREFIX + schoolId);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      localStorage.removeItem(NAMES_LOCAL_STORAGE_PREFIX + schoolId);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setLocalNames(schoolId: string, names: string[]): void {
  try {
    localStorage.setItem(
      NAMES_LOCAL_STORAGE_PREFIX + schoolId,
      JSON.stringify({ data: names, expiresAt: Date.now() + NAMES_CACHE_TTL_MS })
    );
  } catch {}
}

function appendLocalName(schoolId: string, newName: string): void {
  if (!newName) return;
  const existing = getLocalNames(schoolId) || namesCache.get(`names:${schoolId}`) || [];
  if (!existing.includes(newName)) {
    const updated = [...existing, newName].sort();
    namesCache.set(`names:${schoolId}`, updated, NAMES_CACHE_TTL_MS);
    setLocalNames(schoolId, updated);
  }
}

function getSessionPermits(key: string): StudentPermit[] | null {
  try {
    const raw = sessionStorage.getItem(PERMITS_SESSION_PREFIX + key);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      sessionStorage.removeItem(PERMITS_SESSION_PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setSessionPermits(key: string, data: StudentPermit[]): void {
  try {
    sessionStorage.setItem(
      PERMITS_SESSION_PREFIX + key,
      JSON.stringify({ data, expiresAt: Date.now() + PERMITS_SESSION_TTL_MS })
    );
  } catch {}
}

function clearSessionPermits(keyPrefix?: string): void {
  try {
    if (!keyPrefix) {
      sessionStorage.clear();
      return;
    }
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(PERMITS_SESSION_PREFIX + keyPrefix)) {
        sessionStorage.removeItem(k);
      }
    }
  } catch {}
}


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
    // Invalidate permits caches setelah create baru
    permitsCache.invalidate();
    clearSessionPermits();
    // Tambahkan nama baru ke persistent local cache tanpa perlu re-fetch 50 docs
    if (permit.studentName && permit.schoolId) {
      appendLocalName(permit.schoolId, permit.studentName);
    }
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
 * Super-optimized: Hitung jumlah data izin per Tahun Ajaran secara server-side.
 * Hanya memakan 1 read server Firestore (menghemat 99.9% reads dibanding getDocs tanpa limit).
 */
export const getPermitCountByTA = async (
  schoolId: string,
  tahunAjaran: string,
  type?: PermitType
): Promise<number> => {
  try {
    const constraints = [
      where('schoolId', '==', schoolId),
      where('tahunAjaran', '==', tahunAjaran)
    ];
    if (type) {
      constraints.push(where('type', '==', type));
    }
    const q = query(collection(db, PERMITS_COLLECTION), ...constraints);
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.warn("getPermitCountByTA failed, fallback to 0:", error);
    return 0;
  }
};

/**
 * Super-optimized: Mengambil ringkasan jumlah (total, late, exit) dalam 1 panggilan paralel.
 * Hanya memakan 3 reads server Firestore total (1 read per query count).
 */
export const getPermitStatsCountByTA = async (
  schoolId: string,
  tahunAjaran: string
): Promise<{ total: number; late: number; exit: number }> => {
  try {
    const [total, late, exit] = await Promise.all([
      getPermitCountByTA(schoolId, tahunAjaran),
      getPermitCountByTA(schoolId, tahunAjaran, PermitType.LATE_ENTRY),
      getPermitCountByTA(schoolId, tahunAjaran, PermitType.EXIT_PERMIT),
    ]);
    return { total, late, exit };
  } catch (error) {
    console.warn("getPermitStatsCountByTA failed:", error);
    return { total: 0, late: 0, exit: 0 };
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
 * Menggunakan multilevel cache: MemoryCache (5 min) -> SessionStorage (10 min) -> Firestore (IndexedDB persistence).
 * Mengurangi reads dari ribuan ke 0 untuk kunjungan berulang di sesi yang sama.
 */
export const getPermitsBySchoolTA = async (schoolId: string, tahunAjaran: string): Promise<StudentPermit[]> => {
  const cacheKey = `${schoolId}:${tahunAjaran}`;

  // 1. Check in-memory cache first (5 min TTL)
  const cached = permitsCache.get(cacheKey);
  if (cached) return cached;

  // 2. Check sessionStorage cache (10 min TTL - survives tab navigation & re-render)
  const sessionCached = getSessionPermits(cacheKey);
  if (sessionCached) {
    permitsCache.set(cacheKey, sessionCached, 5 * 60 * 1000);
    return sessionCached;
  }

  try {
    const q = query(
      collection(db, PERMITS_COLLECTION),
      where('schoolId', '==', schoolId),
      where('tahunAjaran', '==', tahunAjaran),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentPermit));

    // Cache to memory and sessionStorage
    permitsCache.set(cacheKey, data, 5 * 60 * 1000);
    setSessionPermits(cacheKey, data);
    return data;
  } catch (error) {
    console.warn("getPermitsBySchoolTA failed:", error);
    return [];
  }
};

/**
 * Optimized: Fetch only student names for autocomplete.
 * - Cek MemoryCache (10 min)
 * - Cek LocalStorage (24 jam) — hemat 100% reads untuk siswa yang membuka berulang kali di HP yang sama!
 * - Query Firestore limit(50) hanya jika cache kosong / kedaluwarsa.
 */
export const getStudentNamesBySchool = async (schoolId: string): Promise<string[]> => {
  const cacheKey = `names:${schoolId}`;

  // 1. Check memory cache (10 min TTL)
  const cached = namesCache.get(cacheKey);
  if (cached) return cached;

  // 2. Check localStorage cache (24 jam TTL - tahan reload & tab baru di HP siswa)
  const localCached = getLocalNames(schoolId);
  if (localCached && localCached.length > 0) {
    namesCache.set(cacheKey, localCached, 10 * 60 * 1000);
    return localCached;
  }

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

    // Cache for 10 minutes memory & 24 hours localStorage
    namesCache.set(cacheKey, result, 10 * 60 * 1000);
    setLocalNames(schoolId, result);
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
    clearSessionPermits();
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
    clearSessionPermits();
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
    permitsCache.invalidate();
    clearSessionPermits();
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