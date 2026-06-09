const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Delete a user and their Firestore record.
 * Only callable by Super Admins.
 */
exports.deleteUserAccount = onCall({ cors: true }, async (request) => {
  const { uid } = request.data;
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  // 1. Verify caller is Super Admin
  const callerDoc = await admin.firestore().collection("admins").doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "SUPER_ADMIN") {
    throw new HttpsError("permission-denied", "Only Super Admins can delete accounts.");
  }

  try {
    // 2. Delete from Firebase Auth
    await admin.auth().deleteUser(uid);
    
    // 3. Delete from Firestore admins collection
    await admin.firestore().collection("admins").doc(uid).delete();

    return { success: true, message: `User ${uid} deleted successfully.` };
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Reset user password manually.
 * Only callable by Super Admins.
 */
exports.resetUserPassword = onCall({ cors: true }, async (request) => {
  const { uid, newPassword } = request.data;
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  // 1. Verify caller is Super Admin
  const callerDoc = await admin.firestore().collection("admins").doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "SUPER_ADMIN") {
    throw new HttpsError("permission-denied", "Only Super Admins can reset passwords.");
  }

  try {
    // 2. Update password in Firebase Auth
    await admin.auth().updateUser(uid, {
      password: newPassword,
    });

    return { success: true, message: `Password for ${uid} updated successfully.` };
  } catch (error) {
    console.error("Error updating password:", error);
    throw new HttpsError("internal", error.message);
  }
});
