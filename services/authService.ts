import { db, doc, getDoc, collection, getDocs, query, where } from '../firebase';
import { AdminUser, UserRole } from '../types';

const ADMINS_COLLECTION = 'admins';

/**
 * Get admin profile from Firestore `admins/{uid}`
 */
export const getAdminProfile = async (uid: string): Promise<AdminUser | null> => {
  try {
    const docRef = doc(db, ADMINS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        email: data.email || '',
        name: data.name || '',
        role: data.role as UserRole,
        schoolId: data.schoolId || '',
        createdAt: data.createdAt,
        createdBy: data.createdBy,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return null;
  }
};

/**
 * Check if a UID is an authorized admin
 */
export const isUserAuthorized = async (uid: string): Promise<boolean> => {
  const profile = await getAdminProfile(uid);
  return profile !== null;
};

/**
 * Get all admins for a school
 */
export const getAdminsBySchool = async (schoolId: string): Promise<AdminUser[]> => {
  try {
    const q = query(collection(db, ADMINS_COLLECTION), where('schoolId', '==', schoolId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        uid: d.id,
        email: data.email || '',
        name: data.name || '',
        role: data.role as UserRole,
        schoolId: data.schoolId || '',
        createdAt: data.createdAt,
        createdBy: data.createdBy,
      };
    });
  } catch (error) {
    console.error('Error fetching admins:', error);
    return [];
  }
};
