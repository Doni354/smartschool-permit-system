import { functions, httpsCallable } from '../firebase';
import { AdminUser } from '../types';

/**
 * Delete a user account (Auth + Firestore) via Cloud Functions.
 * This is the ONLY way to delete another user's Auth account from the client.
 */
export const deleteAdminAccountTotal = async (uid: string): Promise<void> => {
  const deleteFunc = httpsCallable(functions, 'deleteUserAccount');
  await deleteFunc({ uid });
};

/**
 * Reset admin password via Cloud Functions.
 * Updates the password in Firebase Auth without sending an email.
 */
export const resetAdminPasswordManual = async (uid: string, newPassword: string): Promise<void> => {
  const resetFunc = httpsCallable(functions, 'resetUserPassword');
  await resetFunc({ uid, newPassword });
};
