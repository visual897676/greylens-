// firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    setDoc,
    updateDoc, 
    deleteDoc,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    onSnapshot,
    arrayUnion,
    arrayRemove,
    runTransaction,
    increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { 
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    updateProfile,
    updateEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
    getStorage,
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// 🔑 YOUR FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyA1QIDUpgNUxrNnZqSR6vb6YZnmjiOJN0k",
    authDomain: "digital-journel.firebaseapp.com",
    projectId: "digital-journel",
    storageBucket: "digital-journel.firebasestorage.app",
    messagingSenderId: "660722836798",
    appId: "1:660722836798:web:ad26d9124f99166103786f",
    measurementId: "G-RT0JLGP1GP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ✅ EXPORT EVERYTHING
export { 
    db, 
    auth,
    storage,
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    setDoc,
    updateDoc, 
    deleteDoc,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    onSnapshot,
    arrayUnion,
    arrayRemove,
    runTransaction,
    increment,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    updateProfile,
    updateEmail,
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
};