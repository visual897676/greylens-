// Admin/auth-check.js
import { auth, onAuthStateChanged } from '../firebase-config.js';

// Admin email
const ADMIN_EMAIL = "affanawan189@gmail.com";

// Check authentication status
onAuthStateChanged(auth, (user) => {
    // If not logged in at all - redirect to login
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    
    // Check if it's the admin email
    if (user.email !== ADMIN_EMAIL) {
        // Logged in but not admin - sign out and redirect
        alert("Access denied. Admin only.");
        auth.signOut();
        window.location.href = "login.html";
        return;
    }
    
    // Admin is authenticated - page will load normally
    console.log("✅ Admin logged in:", user.email);
});