// Admin/admin-settings.js
import { db, doc, getDoc, setDoc } from '../firebase-config.js';

export async function loadAdminSettings() {
    try {
        const docRef = doc(db, "settings", "siteSettings");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const settings = docSnap.data();
            applyAdminSettings(settings);
            return settings;
        }
    } catch (error) {
        console.error('Error loading admin settings:', error);
    }
    
    // Default fallback
    const defaultSettings = {
        siteName: 'Digital Journal',
        siteTagline: 'Thoughtful Writing on Society & Governance',
        contactEmail: 'editor@digitaljournal.com',
        metaTitle: 'Digital Journal'
    };
    applyAdminSettings(defaultSettings);
    return defaultSettings;
}

export async function saveAdminSettings(settings) {
    try {
        await setDoc(doc(db, "settings", "siteSettings"), settings);
        console.log('✅ Settings saved successfully');
        return true;
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        return false;
    }
}

function applyAdminSettings(settings) {
    // Update admin header logo
    const adminLogo = document.querySelector('.admin-logo');
    if (adminLogo && settings.siteName) {
        const iconHtml = adminLogo.querySelector('i')?.outerHTML || '<i class="fas fa-search" style="font-size:1.4rem; color:#a4a3a2;"></i>';
        const spanHtml = adminLogo.querySelector('span')?.outerHTML || '<span>Admin</span>';
        adminLogo.innerHTML = `${iconHtml} ${settings.siteName} ${spanHtml}`;
    }

    // Update page title
    if (settings.metaTitle) {
        document.title = `${settings.metaTitle} - Admin`;
    }

    console.log('✅ Admin settings applied:', settings.siteName);
}