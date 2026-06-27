// Public/load-settings.js
import { db, doc, getDoc } from '../firebase-config.js';

const SETTINGS_DOC_ID = 'siteSettings';

export async function loadSiteSettings() {
    try {
        const docRef = doc(db, "settings", SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const settings = docSnap.data();
            applySettings(settings);
            return settings;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
    
    // Default settings
    const defaultSettings = {
        siteName: 'Digital Journal',
        siteTagline: 'Thoughtful Writing on Society & Governance',
        contactEmail: 'editor@digitaljournal.com'
    };
    applySettings(defaultSettings);
    return defaultSettings;
}

function applySettings(settings) {
    // Update site name
    const nameElements = document.querySelectorAll('.site-name, .footer-logo, .logo-text');
    nameElements.forEach(el => {
        if (el.textContent) {
            el.textContent = settings.siteName || 'Digital Journal';
        }
    });

    // Update tagline
    const taglineElements = document.querySelectorAll('.site-tagline, .footer-text');
    taglineElements.forEach(el => {
        if (el.textContent) {
            el.textContent = settings.siteTagline || '';
        }
    });

    // Update contact email
    const emailElements = document.querySelectorAll('.contact-email, [href^="mailto:"]');
    emailElements.forEach(el => {
        if (el.href) {
            el.href = `mailto:${settings.contactEmail || 'affanawan189@gmail.com'}`;
        }
        if (el.textContent && el.textContent.includes('@')) {
            el.textContent = settings.contactEmail || 'affanawan189@gmail.com';
        }
    });

    console.log('✅ Settings applied:', settings);
}