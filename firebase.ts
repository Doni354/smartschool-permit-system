import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs, getDoc, orderBy, Timestamp, serverTimestamp, doc, deleteDoc, updateDoc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyB9L6LOrxcnDZov4xEH522MZEqOtmTXfmg",
  authDomain: "smartschool-34158.firebaseapp.com",
  projectId: "smartschool-34158",
  storageBucket: "smartschool-34158.firebasestorage.app",
  messagingSenderId: "1059896900374",
  appId: "1:1059896900374:web:26a1a334fbdcfc8199ee37",
  measurementId: "G-GNYZ9301HV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

// Secondary app for creating users without signing out current admin
const secondaryApp = initializeApp(firebaseConfig, "secondary");
export const secondaryAuth = getAuth(secondaryApp);

// Export Firestore functions for use in services
export { collection, addDoc, query, where, getDocs, getDoc, orderBy, Timestamp, serverTimestamp, doc, deleteDoc, updateDoc, setDoc };
// Export Auth functions
export { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile };
// Export Functions
export { httpsCallable };