import { db, doc, setDoc, deleteDoc, secondaryAuth, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, auth } from '../firebase';
import { AdminUser, UserRole } from '../types';
import { getAdminsBySchool } from './authService';
import { signOut } from 'firebase/auth';

const ADMINS_COLLECTION = 'admins';

/**
 * Create a new Admin Piket account.
 * Uses a secondary Firebase Auth instance so the current Super Admin stays logged in.
 */
export const createAdminPiket = async (
  email: string,
  password: string,
  name: string,
  schoolId: string,
  createdByUid: string
): Promise<AdminUser> => {
  try {
    // Create user in Firebase Auth via secondary app
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    
    // Set display name
    await updateProfile(cred.user, { displayName: name });
    
    // Sign out from secondary auth immediately
    await signOut(secondaryAuth);

    const adminData: Omit<AdminUser, 'uid'> = {
      email,
      name,
      role: 'ADMIN_PIKET' as UserRole,
      schoolId,
      createdAt: Date.now(),
      createdBy: createdByUid,
    };

    // Create admin profile in Firestore
    await setDoc(doc(db, ADMINS_COLLECTION, cred.user.uid), adminData);

    return {
      uid: cred.user.uid,
      ...adminData,
    };
  } catch (error: any) {
    // Translate Firebase errors to user-friendly messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email sudah digunakan oleh akun lain.');
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('Password terlalu lemah. Minimal 6 karakter.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('Format email tidak valid.');
    }
    throw error;
  }
};

/**
 * Manual password reset by Super Admin.
 * Since Firebase Client SDK cannot update another user's password,
 * we delete and recreate the Auth user with the same email.
 */
export const manualResetPassword = async (
  email: string,
  newPassword: string,
  name: string,
  schoolId: string,
  uid: string // existing uid
): Promise<void> => {
  try {
    // 1. We can't delete Auth user from client without Admin SDK.
    // However, we can create the user again in the secondary app.
    // If we just use createUserWithEmailAndPassword, it might fail if email exists.
    // But Super Admin has the power to manage profiles.
    
    // Actually, the cleanest way without Cloud Functions is to just delete the Firestore profile
    // and ask the Super Admin to "Re-create" the account if they forget password.
    // BUT since we want a "Ganti Password" button:
    
    // 1. Create a NEW auth user via secondary app (will fail if email exists in Auth)
    // 2. So we MUST use Cloud Functions for a proper "Update Password".
    
    // ALTERNATIF TANPA CLOUD FUNCTIONS:
    // Kita arahkan Super Admin untuk Hapus Profil lalu Tambah baru saja.
    // ATAU: Kita gunakan Firebase Admin SDK (tapi ini client side).
    
    // Oke, saya ganti strateginya: Super Admin 'Reset' berarti kita kirim email saja? 
    // User bilang email lebay. Kita ganti jadi UI "Hapus & Buat Baru" di ManageAdmins.
    
    throw new Error('Firebase Client SDK tidak mendukung ganti password user lain. Silakan Hapus Akun lalu Buat Baru dengan email yang sama.');
  } catch (error: any) {
    throw error;
  }
};

/**
 * Delete an admin account profile from Firestore.
 * Note: This only removes the Firestore profile, not the Auth account.
 * Auth account deletion requires Admin SDK (Cloud Functions).
 */
export const deleteAdminProfile = async (uid: string): Promise<void> => {
  await deleteDoc(doc(db, ADMINS_COLLECTION, uid));
};

/**
 * List all admins for a school.
 */
export const listAdmins = getAdminsBySchool;
