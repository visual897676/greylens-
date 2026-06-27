// Public/public-auth.js - FIXED
// Re-export auth functions from firebase-config.js

import { 
    auth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} from '../firebase-config.js';

// Re-export everything
export { 
    auth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
};