/* ============================================================
   ADMIN PANEL - MASTER JAVASCRIPT (FIREBASE VERSION)
   ============================================================ */

// ============================================================
// 0. FIREBASE IMPORTS - FIXED
// ============================================================
import { 
    db, 
    auth,
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where,
    orderBy,
    limit,
    onAuthStateChanged,
    signOut,
    setDoc
} from '../firebase-config.js';

// Admin email
const ADMIN_EMAIL = "affanawan189@gmail.com";

// ============================================================
// 1. ADMIN AUTHENTICATION (FIREBASE)
// ============================================================

/**
 * Global user state
 */
let currentUser = null;
let userData = null;
let isAdmin = false;

/**
 * Check if user is authenticated and has appropriate role
 * This runs on every admin page
 */
function setupAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Not logged in - redirect to admin login
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
            return;
        }

        currentUser = user;
        isAdmin = (user.email === ADMIN_EMAIL);

        // Get user data from Firestore
        try {
            const q = query(collection(db, "users"), where("email", "==", user.email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                querySnapshot.forEach((doc) => {
                    userData = { id: doc.id, ...doc.data() };
                });
                
                // Check if user is authorized (admin or approved contributor)
                if (!isAdmin && (userData.role !== 'contributor' || userData.status !== 'approved')) {
                    // Not authorized - sign out and redirect
                    await signOut(auth);
                    window.location.href = '../Public/login.html';
                    return;
                }
            } else if (!isAdmin) {
                // User exists in Auth but not in Firestore - sign out
                await signOut(auth);
                window.location.href = '../Public/login.html';
                return;
            }

            // Update UI with user info
            updateAdminHeader();
            applyRoleBasedVisibility();

            // Load page-specific data
            loadPageData();

        } catch (error) {
            console.error('Error checking user role:', error);
            await signOut(auth);
            window.location.href = '../Public/login.html';
        }
    });
}

/**
 * Get current user info
 */
function getUserInfo() {
    if (isAdmin) {
        return {
            name: 'Admin',
            email: ADMIN_EMAIL,
            role: 'admin',
            id: currentUser?.uid || 'admin-user',
            isLoggedIn: true,
            isAdmin: true
        };
    }
    
    if (userData) {
        return {
            name: userData.name || 'Contributor',
            email: userData.email || '',
            role: userData.role || 'contributor',
            id: userData.id || currentUser?.uid,
            isLoggedIn: true,
            isAdmin: false
        };
    }
    
    return {
        name: 'Guest',
        email: '',
        role: 'guest',
        id: null,
        isLoggedIn: false,
        isAdmin: false
    };
}

/**
 * Logout user - Firebase sign out
 */
async function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await signOut(auth);
            window.location.href = '../Public/login.html';
        } catch (error) {
            console.error('Logout error:', error);
            showNotification('❌ Logout failed: ' + error.message, 'error');
        }
    }
}

/**
 * Update header with user info
 */
function updateAdminHeader() {
    const user = getUserInfo();
    
    // Update name elements
    const nameElements = document.querySelectorAll('#adminName, #greetingName');
    nameElements.forEach(el => {
        if (el) el.textContent = user.name;
    });
    
    // Update avatar
    const avatar = document.querySelector('#userAvatar, .avatar');
    if (avatar) {
        avatar.textContent = user.name.charAt(0).toUpperCase();
    }
    
    // Update role display
    const roleDisplay = document.getElementById('userRoleDisplay');
    if (roleDisplay) {
        roleDisplay.textContent = user.isAdmin ? 'Administrator' : 'Contributor';
    }
    
    // Update role badge
    const roleBadge = document.getElementById('roleBadge');
    if (roleBadge) {
        if (user.isAdmin) {
            roleBadge.textContent = 'Admin';
            roleBadge.className = 'role-badge admin';
        } else {
            roleBadge.textContent = 'Contributor';
            roleBadge.className = 'role-badge contributor';
        }
    }
}

/**
 * Apply role-based visibility to elements
 */
function applyRoleBasedVisibility() {
    const user = getUserInfo();
    const isAdminUser = user.isAdmin;
    
    // Admin-only elements
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdminUser ? 'block' : 'none';
    });
    
    // Admin show elements
    document.querySelectorAll('.admin-show').forEach(el => {
        el.style.display = isAdminUser ? 'block' : 'none';
    });
    
    // Contributor-only elements
    document.querySelectorAll('.contributor-only').forEach(el => {
        el.style.display = isAdminUser ? 'none' : 'block';
    });
    
    // Hide admin sidebar items for contributors
    if (!isAdminUser) {
        document.querySelectorAll('#adminDivider, #adminLabel, #contributorsNavLink, #categoriesNavLink, #settingsDivider, #settingsLabel, #settingsNavLink').forEach(el => {
            if (el) el.style.display = 'none';
        });
    }
}

/**
 * Load page-specific data
 */
function loadPageData() {
    const page = window.location.pathname.split('/').pop();
    
    switch (page) {
        case 'dashboard.html':
            loadDashboardStats();
            loadDashboardActivity();
            break;
        case 'articles.html':
            loadArticlesTable();
            break;
        case 'contributors.html':
            loadContributorsGrid();
            break;
        case 'categories.html':
            loadCategoriesGrid();
            break;
        case 'profile.html':
            loadProfileData();
            break;
        case 'settings.html':
            loadSettingsData();
            break;
        case 'edit.html':
            loadArticleForEdit();
            break;
        default:
            // No specific data to load
            break;
    }
}

// ============================================================
// 2. NOTIFICATION SYSTEM
// ============================================================

/**
 * Show a notification toast
 * @param {string} message - The message to display
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {number} duration - Time in ms before auto-hide
 */
function showNotification(message, type = 'info', duration = 4000) {
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    const icon = icons[type] || icons.info;
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${escapeHtml(message)}</span>
        <button class="notification-close">&times;</button>
    `;

    const colors = {
        success: '#4CAF50',
        error: '#DC2626',
        warning: '#FF9800',
        info: '#4A6A7A'
    };
    notification.style.borderLeftColor = colors[type] || colors.info;

    notification.querySelector('.notification-close').addEventListener('click', function() {
        notification.remove();
    });

    document.body.appendChild(notification);

    requestAnimationFrame(() => {
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
    });

    const timeoutId = setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.transform = 'translateY(120px)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 400);
        }
    }, duration);
    
    notification.dataset.timeoutId = timeoutId;
}

// ============================================================
// 3. ARTICLE MANAGEMENT (CRUD) - FIREBASE
// ============================================================

/**
 * Get all articles from Firebase
 */
async function getArticles() {
    try {
        const snapshot = await getDocs(collection(db, "articles"));
        const articles = [];
        snapshot.forEach(doc => {
            articles.push({ id: doc.id, ...doc.data() });
        });
        return articles;
    } catch (error) {
        console.error('Error getting articles:', error);
        showNotification('Error loading articles', 'error');
        return [];
    }
}

/**
 * Get articles for current user (contributor only sees their own)
 */
async function getMyArticles() {
    const user = getUserInfo();
    if (user.isAdmin) {
        return getArticles();
    }
    
    try {
        const q = query(collection(db, "articles"), where("authorEmail", "==", user.email));
        const snapshot = await getDocs(q);
        const articles = [];
        snapshot.forEach(doc => {
            articles.push({ id: doc.id, ...doc.data() });
        });
        return articles;
    } catch (error) {
        console.error('Error getting user articles:', error);
        return [];
    }
}

/**
 * Get a single article by ID
 */
async function getArticleById(id) {
    try {
        const docRef = doc(db, "articles", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting article:', error);
        return null;
    }
}

/**
 * Create a new article in Firebase
 */
async function createArticle(articleData) {
    try {
        const user = getUserInfo();
        const docRef = await addDoc(collection(db, "articles"), {
            ...articleData,
            authorEmail: user.email,
            views: 0,
            comments: 0,
            createdAt: new Date().toISOString()
        });
        return { id: docRef.id, ...articleData };
    } catch (error) {
        console.error('Error creating article:', error);
        showNotification('Error creating article', 'error');
        return null;
    }
}

/**
 * Update an existing article in Firebase
 */
async function updateArticle(id, updates) {
    try {
        const docRef = doc(db, "articles", id);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Error updating article:', error);
        showNotification('Error updating article', 'error');
        return false;
    }
}

/**
 * Delete an article from Firebase
 */
async function deleteArticle(id) {
    try {
        await deleteDoc(doc(db, "articles", id));
        return true;
    } catch (error) {
        console.error('Error deleting article:', error);
        showNotification('Error deleting article', 'error');
        return false;
    }
}

/**
 * Get article statistics
 */
async function getArticleStats() {
    const articles = await getMyArticles();
    const total = articles.length;
    const drafts = articles.filter(a => a.status === 'draft').length;
    const published = articles.filter(a => a.status === 'published').length;
    const pending = articles.filter(a => a.status === 'pending').length;
    return { total, drafts, published, pending };
}

/**
 * Get recent articles (for dashboard activity)
 */
async function getRecentArticles(limitCount = 5) {
    const articles = await getMyArticles();
    return articles
        .sort((a, b) => {
            const dateA = new Date(a.createdAt || a.date);
            const dateB = new Date(b.createdAt || b.date);
            return dateB - dateA;
        })
        .slice(0, limitCount);
}

/**
 * Load articles table for articles page
 */
async function loadArticlesTable() {
    const container = document.getElementById('articlesTableBody');
    if (!container) return;
    
    try {
        const articles = await getMyArticles();
        
        if (articles.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center;padding:40px;color:var(--color-gray);">
                        <i class="fas fa-newspaper" style="font-size:2rem;display:block;margin-bottom:12px;color:var(--color-border);"></i>
                        No articles found. Start writing your first article!
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        articles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        articles.forEach(article => {
            const statusClass = article.status === 'published' ? 'published' : 
                               article.status === 'pending' ? 'pending' : 'draft';
            const statusLabel = article.status ? article.status.charAt(0).toUpperCase() + article.status.slice(1) : 'Draft';
            
            html += `
                <tr>
                    <td>${escapeHtml(article.title || 'Untitled')}</td>
                    <td>${escapeHtml(article.author || 'Unknown')}</td>
                    <td>${escapeHtml(article.category || 'Uncategorized')}</td>
                    <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                    <td style="text-align:center;">${article.views || 0}</td>
                    <td style="text-align:center;">${article.comments || 0}</td>
                    <td style="font-size:0.85rem;color:var(--color-gray);">${formatDate(article.date || article.createdAt)}</td>
                    <td style="text-align:center;">
                        <div style="display:flex;gap:4px;justify-content:center;">
                            <a href="edit.html?id=${article.id}" class="btn btn-primary btn-sm" title="Edit">
                                <i class="fas fa-edit"></i>
                            </a>
                            <button onclick="window.deleteArticleById('${article.id}')" class="btn btn-danger btn-sm" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
        
        // Update stats
        const stats = await getArticleStats();
        document.getElementById('totalCount').textContent = stats.total;
        document.getElementById('showingCount').textContent = articles.length;
        
    } catch (error) {
        console.error('Error loading articles:', error);
        container.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;padding:40px;color:var(--color-error);">
                    <i class="fas fa-exclamation-circle" style="font-size:2rem;display:block;margin-bottom:12px;"></i>
                    Error loading articles. Please refresh.
                </td>
            </tr>
        `;
    }
}

/**
 * Delete article by ID (global function for onclick)
 */
window.deleteArticleById = async function(id) {
    if (!confirm('Are you sure you want to delete this article?')) return;
    const success = await deleteArticle(id);
    if (success) {
        showNotification('✅ Article deleted successfully', 'success');
        loadArticlesTable();
    }
};

// ============================================================
// 4. CONTRIBUTOR MANAGEMENT - FIREBASE
// ============================================================

/**
 * Get all contributors (users)
 */
async function getContributors() {
    try {
        const snapshot = await getDocs(collection(db, "users"));
        const users = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        return users;
    } catch (error) {
        console.error('Error getting contributors:', error);
        return [];
    }
}

/**
 * Load contributors grid for contributors page
 */
async function loadContributorsGrid() {
    const container = document.getElementById('contributorsGrid');
    if (!container) return;
    
    try {
        const users = await getContributors();
        const contributors = users.filter(u => u.role === 'contributor');
        
        if (contributors.length === 0) {
            container.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--color-gray);">
                    <i class="fas fa-users" style="font-size:3rem;display:block;margin-bottom:16px;color:var(--color-border);"></i>
                    <h3 style="font-family:var(--font-serif);color:var(--color-heading);">No Contributors Yet</h3>
                    <p>Contributors will appear here once they register and are approved.</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        contributors.forEach(c => {
            const statusClass = c.status === 'approved' ? 'approved' : 
                               c.status === 'rejected' ? 'rejected' : 'pending';
            const statusLabel = c.status ? c.status.charAt(0).toUpperCase() + c.status.slice(1) : 'Pending';
            
            html += `
                <div class="contributor-card">
                    <div class="card-header">
                        <div class="card-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="card-info">
                            <div class="name">${escapeHtml(c.name)}
                                <span class="status-badge ${statusClass}">${statusLabel}</span>
                            </div>
                            <div class="role">${escapeHtml(c.role || 'Contributor')}</div>
                            <span class="email">${escapeHtml(c.email)}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <p class="bio">${escapeHtml(c.bio || 'No bio provided yet.')}</p>
                    </div>
                    <div class="card-footer">
                        <div class="stats">
                            <span><i class="fas fa-calendar"></i> Joined: ${formatDate(c.createdAt)}</span>
                        </div>
                        <div class="card-actions">
                            ${c.status === 'pending' ? `
                                <button onclick="window.approveContributor('${c.id}')" class="btn btn-approve btn-sm">
                                    <i class="fas fa-check"></i> Approve
                                </button>
                                <button onclick="window.rejectContributor('${c.id}')" class="btn btn-reject btn-sm">
                                    <i class="fas fa-times"></i> Reject
                                </button>
                            ` : ''}
                            ${c.status === 'approved' ? `
                                <button onclick="window.rejectContributor('${c.id}')" class="btn btn-reject btn-sm">
                                    <i class="fas fa-user-slash"></i> Remove
                                </button>
                            ` : ''}
                            <button onclick="window.deleteContributorById('${c.id}')" class="btn btn-danger btn-sm">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Update stats
        document.getElementById('totalCount').textContent = contributors.length;
        document.getElementById('showingCount').textContent = contributors.length;
        
        const pending = contributors.filter(u => u.status === 'pending').length;
        const pendingBadge = document.getElementById('pendingBadge');
        if (pendingBadge) {
            pendingBadge.innerHTML = pending > 0 ? 
                `<span style="background:#FEF3C7;color:#92400E;padding:2px 10px;border-radius:20px;font-size:0.7rem;font-weight:600;">${pending} pending</span>` : '';
        }
        
    } catch (error) {
        console.error('Error loading contributors:', error);
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--color-error);">Error loading contributors</div>`;
    }
}

/**
 * Approve a contributor
 */
window.approveContributor = async function(id) {
    if (!confirm('Approve this user as a contributor?')) return;
    try {
        await updateDoc(doc(db, "users", id), { status: 'approved' });
        showNotification('✅ Contributor approved successfully', 'success');
        loadContributorsGrid();
    } catch (error) {
        console.error('Error approving contributor:', error);
        showNotification('❌ Error approving contributor', 'error');
    }
};

/**
 * Reject a contributor
 */
window.rejectContributor = async function(id) {
    if (!confirm('Reject this user?')) return;
    try {
        await updateDoc(doc(db, "users", id), { status: 'rejected' });
        showNotification('✅ Contributor rejected', 'success');
        loadContributorsGrid();
    } catch (error) {
        console.error('Error rejecting contributor:', error);
        showNotification('❌ Error rejecting contributor', 'error');
    }
};

/**
 * Delete a contributor by ID
 */
window.deleteContributorById = async function(id) {
    if (!confirm('Delete this user permanently?')) return;
    try {
        await deleteDoc(doc(db, "users", id));
        showNotification('🗑️ Contributor deleted', 'success');
        loadContributorsGrid();
    } catch (error) {
        console.error('Error deleting contributor:', error);
        showNotification('❌ Error deleting contributor', 'error');
    }
};

// ============================================================
// 5. CATEGORY MANAGEMENT - FIREBASE
// ============================================================

/**
 * Get all categories
 */
async function getCategories() {
    try {
        const snapshot = await getDocs(collection(db, "categories"));
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        return categories;
    } catch (error) {
        console.error('Error getting categories:', error);
        return [];
    }
}

/**
 * Load categories grid for categories page
 */
async function loadCategoriesGrid() {
    const container = document.getElementById('categoriesGrid');
    if (!container) return;
    
    try {
        const categories = await getCategories();
        
        if (categories.length === 0) {
            container.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--color-gray);">
                    <i class="fas fa-tags" style="font-size:3rem;display:block;margin-bottom:16px;color:var(--color-border);"></i>
                    <h3 style="font-family:var(--font-serif);color:var(--color-heading);">No Categories Yet</h3>
                    <p>Create categories to organize your articles.</p>
                    <button class="btn btn-primary" style="margin-top:12px;" onclick="openAddCategoryModal()">
                        <i class="fas fa-plus"></i> Add First Category
                    </button>
                </div>
            `;
            return;
        }
        
        let html = '';
        categories.sort((a, b) => a.name.localeCompare(b.name));
        
        categories.forEach(c => {
            const iconMap = {
                'Governance': 'fa-landmark',
                'Law': 'fa-gavel',
                'Economics': 'fa-chart-line',
                'Society': 'fa-users',
                'Culture': 'fa-palette',
                'History': 'fa-book',
                'Opinion': 'fa-comment',
                'Public Policy': 'fa-balance-scale'
            };
            const icon = iconMap[c.name] || 'fa-tag';
            
            html += `
                <div class="category-card">
                    <div class="category-info">
                        <div class="category-icon"><i class="fas ${icon}"></i></div>
                        <div class="category-details">
                            <div class="name">
                                ${escapeHtml(c.name)}
                                <span class="count">${c.count || 0} article${(c.count || 0) !== 1 ? 's' : ''}</span>
                            </div>
                            <span class="slug">/category/${escapeHtml(c.name.toLowerCase().replace(/ /g, '-'))}</span>
                        </div>
                    </div>
                    <div class="category-actions">
                        <button onclick="window.editCategory('${c.id}')" class="btn btn-primary btn-sm" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="window.deleteCategoryById('${c.id}')" class="btn btn-danger btn-sm" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Update stats
        document.getElementById('totalCount').textContent = categories.length;
        document.getElementById('showingCount').textContent = categories.length;
        
    } catch (error) {
        console.error('Error loading categories:', error);
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--color-error);">Error loading categories</div>`;
    }
}

/**
 * Add a category
 */
async function addCategory(name) {
    try {
        const docRef = await addDoc(collection(db, "categories"), {
            name: name,
            count: 0
        });
        return { id: docRef.id, name: name, count: 0 };
    } catch (error) {
        console.error('Error adding category:', error);
        showNotification('❌ Error adding category', 'error');
        return null;
    }
}

/**
 * Delete a category by ID
 */
window.deleteCategoryById = async function(id) {
    if (!confirm('Delete this category?')) return;
    try {
        await deleteDoc(doc(db, "categories", id));
        showNotification('🗑️ Category deleted', 'success');
        loadCategoriesGrid();
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('❌ Error deleting category', 'error');
    }
};

/**
 * Edit category
 */
window.editCategory = async function(id) {
    // Open modal with category data
    const categories = await getCategories();
    const category = categories.find(c => c.id === id);
    if (!category) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Category';
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryModal').classList.add('active');
    document.getElementById('categoryModal').dataset.editId = id;
};

// ============================================================
// 6. PROFILE MANAGEMENT
// ============================================================

/**
 * Load profile data
 */
async function loadProfileData() {
    const nameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('emailAddress');
    const bioInput = document.getElementById('bioText');
    
    if (!nameInput) return;
    
    const user = getUserInfo();
    nameInput.value = user.name || '';
    emailInput.value = user.email || '';
    
    // Load bio from Firestore settings
    try {
        const docRef = doc(db, "settings", "adminProfile");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (bioInput) bioInput.value = data.bio || '';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
    
    // Load stats
    const stats = await getArticleStats();
    document.getElementById('totalArticles').textContent = stats.total;
    document.getElementById('totalViews').textContent = '0'; // TODO: Add view tracking
    document.getElementById('totalComments').textContent = '0'; // TODO: Add comment tracking
}

// ============================================================
// 7. SETTINGS MANAGEMENT
// ============================================================

/**
 * Load settings data
 */
async function loadSettingsData() {
    try {
        const docRef = doc(db, "settings", "siteSettings");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('siteName').value = data.siteName || '';
            document.getElementById('siteTagline').value = data.siteTagline || '';
            document.getElementById('contactEmail').value = data.contactEmail || '';
            document.getElementById('metaTitle').value = data.metaTitle || '';
            document.getElementById('metaDescription').value = data.metaDescription || '';
            document.getElementById('socialImage').value = data.socialImage || '';
            document.getElementById('twitterUrl').value = data.twitterUrl || '';
            document.getElementById('linkedinUrl').value = data.linkedinUrl || '';
            document.getElementById('facebookUrl').value = data.facebookUrl || '';
            document.getElementById('whatsappUrl').value = data.whatsappUrl || '';
            document.getElementById('enableComments').checked = data.enableComments !== false;
            document.getElementById('enableNewsletter').checked = data.enableNewsletter !== false;
            document.getElementById('enableSocialShare').checked = data.enableSocialShare !== false;
            document.getElementById('enableRelatedArticles').checked = data.enableRelatedArticles !== false;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

/**
 * Save settings
 */
async function saveSettings(settings) {
    try {
        await setDoc(doc(db, "settings", "siteSettings"), settings);
        showNotification('✅ Settings saved successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('❌ Error saving settings', 'error');
        return false;
    }
}

// ============================================================
// 8. ARTICLE EDIT FUNCTIONS
// ============================================================

/**
 * Load article for editing
 */
async function loadArticleForEdit() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    if (!id) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notFound').style.display = 'block';
        return;
    }
    
    try {
        const article = await getArticleById(id);
        
        if (!article) {
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('notFound').style.display = 'block';
            return;
        }
        
        // Check if user has permission to edit
        const user = getUserInfo();
        if (!user.isAdmin && article.authorEmail !== user.email) {
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('notFound').style.display = 'block';
            document.querySelector('#notFound h2').textContent = 'Access Denied';
            document.querySelector('#notFound p').textContent = 'You can only edit your own articles.';
            showNotification('❌ You can only edit your own articles.', 'error');
            return;
        }
        
        // Populate form
        document.getElementById('articleTitle').value = article.title || '';
        document.getElementById('articleSubtitle').value = article.subtitle || '';
        document.getElementById('articleAuthor').value = article.author || '';
        document.getElementById('articleCategory').value = article.category || '';
        document.getElementById('articleContent').value = article.content || '';
        document.getElementById('articleExcerpt').value = article.excerpt || '';
        document.getElementById('articleStatus').value = article.status || 'draft';
        
        // Load tags
        window.tags = article.tags || [];
        renderTags();
        
        // Show image preview
        if (article.image) {
            document.getElementById('currentImagePreview').style.display = 'block';
            document.getElementById('currentImageDisplay').src = article.image;
        }
        
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('editFormContainer').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading article:', error);
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notFound').style.display = 'block';
    }
}

// ============================================================
// 9. VALIDATION HELPERS
// ============================================================

/**
 * Validate email format
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Sanitize HTML (basic)
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Truncate text
 */
function truncateText(text, length = 100) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

// ============================================================
// 10. DATE FORMATTING
// ============================================================

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'Recent';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ============================================================
// 11. DASHBOARD FUNCTIONS
// ============================================================

/**
 * Load dashboard stats
 */
async function loadDashboardStats() {
    try {
        const stats = await getArticleStats();
        const contributors = await getContributors();
        
        const totalEl = document.getElementById('totalArticles');
        const draftEl = document.getElementById('draftArticles');
        const publishedEl = document.getElementById('publishedArticles');
        const contributorsEl = document.getElementById('totalContributors');
        
        if (totalEl) totalEl.textContent = stats.total;
        if (draftEl) draftEl.textContent = stats.drafts;
        if (publishedEl) publishedEl.textContent = stats.published;
        if (contributorsEl) contributorsEl.textContent = contributors.filter(u => u.role === 'contributor').length;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

/**
 * Load dashboard activity
 */
async function loadDashboardActivity() {
    try {
        const articles = await getRecentArticles(5);
        const container = document.getElementById('activityList');
        const empty = document.getElementById('activityEmpty');
        
        if (!container) return;
        
        if (articles.length === 0) {
            if (empty) empty.style.display = 'block';
            container.innerHTML = '';
            return;
        }
        
        if (empty) empty.style.display = 'none';
        
        let html = '<div style="display:flex;flex-direction:column;gap:10px;">';
        
        articles.forEach(a => {
            const color = a.status === 'published' ? '#4CAF50' : '#FF9800';
            const label = a.status === 'published' ? 'Published' : 'Draft';
            
            html += `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#F8F6F3;border-radius:6px;border-left:3px solid ${color};">
                    <div>
                        <strong style="color:#2C3E50;">${escapeHtml(a.title)}</strong>
                        <span style="color:#7F8C8D;font-size:0.8rem;margin-left:12px;">
                            <i class="far fa-calendar"></i> ${formatDate(a.date || a.createdAt)}
                        </span>
                    </div>
                    <span style="font-size:0.7rem;padding:2px 12px;border-radius:20px;background:${color};color:#fff;">
                        ${label}
                    </span>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading dashboard activity:', error);
    }
}

// ============================================================
// 12. SEARCH FUNCTIONALITY
// ============================================================

/**
 * Search articles
 */
async function searchArticles(query) {
    const articles = await getMyArticles();
    const q = query.toLowerCase().trim();
    
    if (!q) return articles;
    
    return articles.filter(a => {
        return (a.title && a.title.toLowerCase().includes(q)) ||
               (a.content && a.content.toLowerCase().includes(q)) ||
               (a.author && a.author.toLowerCase().includes(q)) ||
               (a.category && a.category.toLowerCase().includes(q)) ||
               (a.tags && a.tags.some(t => t.toLowerCase().includes(q)));
    });
}

// ============================================================
// 13. EXPORT FUNCTIONS FOR GLOBAL USE
// ============================================================

// Make functions available globally
window.getUserInfo = getUserInfo;
window.logoutUser = logoutUser;
window.updateAdminHeader = updateAdminHeader;
window.showNotification = showNotification;
window.getArticles = getArticles;
window.getMyArticles = getMyArticles;
window.getArticleById = getArticleById;
window.createArticle = createArticle;
window.updateArticle = updateArticle;
window.deleteArticle = deleteArticle;
window.getArticleStats = getArticleStats;
window.getRecentArticles = getRecentArticles;
window.getContributors = getContributors;
window.getCategories = getCategories;
window.addCategory = addCategory;
window.formatDate = formatDate;
window.escapeHtml = escapeHtml;
window.truncateText = truncateText;
window.isValidEmail = isValidEmail;
window.loadDashboardStats = loadDashboardStats;
window.loadDashboardActivity = loadDashboardActivity;
window.searchArticles = searchArticles;
window.loadArticlesTable = loadArticlesTable;
window.loadContributorsGrid = loadContributorsGrid;
window.loadCategoriesGrid = loadCategoriesGrid;
window.loadProfileData = loadProfileData;
window.loadSettingsData = loadSettingsData;
window.saveSettings = saveSettings;

// ============================================================
// 14. AUTO-INITIALIZE ON PAGE LOAD
// ============================================================

// Setup authentication when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Setup auth
    setupAuth();
    
    // Setup logout buttons
    document.querySelectorAll('#logoutBtn, .btn-logout, .logout-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            logoutUser();
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl + S - Save
        if (e.ctrlKey && e.key === 's') {
            const form = document.querySelector('form');
            if (form) {
                e.preventDefault();
                form.dispatchEvent(new Event('submit'));
            }
        }
        
        // Escape - Close notifications
        if (e.key === 'Escape') {
            document.querySelectorAll('.notification-toast').forEach(n => n.remove());
        }
    });
    
    // Console welcome
    console.log('%c📊 Admin Panel (Firebase)', 'font-size:20px;font-weight:bold;color:#2C3E50;');
    console.log('%c🔥 Using Firebase Authentication', 'font-size:14px;color:#4A6A7A;');
    console.log('%c🔑 Admin email: ' + ADMIN_EMAIL, 'font-size:12px;color:#B8945C;');
});

console.log('%c⚡ Admin Script Loaded Successfully (Firebase)', 'font-size:14px;color:#4CAF50;');