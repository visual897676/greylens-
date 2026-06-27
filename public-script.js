/* ============================================================
   PUBLIC WEBSITE - MASTER JAVASCRIPT (FIREBASE VERSION)
   ============================================================
   This file provides functionality for ALL public pages:
   - Firebase data loading
   - Mobile menu toggle
   - Search functionality
   - Newsletter subscription
   - Article interactions (bookmark, share)
   - Comments system
   - Back to top button
   - Smooth scrolling
   - Notification system
   ============================================================ */

// ============================================================
// 0. FIREBASE IMPORTS - FIXED FOR ROOT
// ============================================================
import { 
    db, 
    auth,
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    query, 
    where,
    onAuthStateChanged
} from './firebase-config.js';

// Admin email
const ADMIN_EMAIL = "affanawan189@gmail.com";

// ============================================================
// GLOBALS
// ============================================================
let allArticles = [];
let allContributors = [];
let allCategories = [];
let currentUser = null;

// ============================================================
// AUTH STATE LISTENER - Update header
// ============================================================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    await updateHeaderLogin();
});

// ============================================================
// UPDATE HEADER LOGIN STATUS - FIXED FOR ROOT
// ============================================================
async function updateHeaderLogin() {
    const writeBtn = document.getElementById('writeBtn');
    if (!writeBtn) return;
    
    if (currentUser) {
        try {
            const q = query(collection(db, "users"), where("email", "==", currentUser.email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                let userData = null;
                querySnapshot.forEach((doc) => {
                    userData = { id: doc.id, ...doc.data() };
                });
                
                // Check if admin
                if (currentUser.email === ADMIN_EMAIL) {
                    writeBtn.href = 'admin/dashboard.html';
                    writeBtn.innerHTML = '<i class="fas fa-pen-fancy"></i><span>Dashboard</span>';
                    return;
                }
                
                // Check if contributor and approved
                if (userData.role === 'contributor' && userData.status === 'approved') {
                    writeBtn.href = 'public/contributor-dashboard.html';
                    writeBtn.innerHTML = '<i class="fas fa-pen-fancy"></i><span>Dashboard</span>';
                    return;
                }
            }
            
            // Default: logged in but not admin or approved contributor
            writeBtn.href = 'public/login.html';
            writeBtn.innerHTML = '<i class="fas fa-pen-fancy"></i><span>Write</span>';
            
        } catch (error) {
            console.error('Error checking user role:', error);
            writeBtn.href = 'public/login.html';
            writeBtn.innerHTML = '<i class="fas fa-pen-fancy"></i><span>Write</span>';
        }
    } else {
        writeBtn.href = 'public/login.html';
        writeBtn.innerHTML = '<i class="fas fa-pen-fancy"></i><span>Write</span>';
    }
}

// ============================================================
// 1. LOAD DATA FROM FIREBASE
// ============================================================
async function loadDataFromFirebase() {
    try {
        console.log('📡 Loading data from Firebase...');

        // Load articles (published only)
        const articlesSnapshot = await getDocs(collection(db, "articles"));
        allArticles = [];
        articlesSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'published') {
                allArticles.push({ id: doc.id, ...data });
            }
        });
        console.log(`✅ ${allArticles.length} articles loaded`);

        // Load contributors (approved contributors only)
        const usersSnapshot = await getDocs(collection(db, "users"));
        allContributors = [];
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.role === 'contributor' && data.status === 'approved') {
                allContributors.push({ id: doc.id, ...data });
            }
        });
        console.log(`✅ ${allContributors.length} contributors loaded`);

        // Load categories
        const categoriesSnapshot = await getDocs(collection(db, "categories"));
        allCategories = [];
        categoriesSnapshot.forEach(doc => {
            allCategories.push({ id: doc.id, ...doc.data() });
        });
        console.log(`✅ ${allCategories.length} categories loaded`);

        return { articles: allArticles, contributors: allContributors, categories: allCategories };

    } catch (error) {
        console.error('❌ Error loading data:', error);
        showNotification('❌ Error loading content. Please refresh.', 'error');
        return { articles: [], contributors: [], categories: [] };
    }
}

// ============================================================
// 2. MOBILE MENU
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    const drawerClose = document.getElementById('drawerClose');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const drawerBackdrop = document.getElementById('drawerBackdrop');

    if (menuToggle && mobileDrawer && drawerBackdrop) {
        menuToggle.addEventListener('click', function() {
            mobileDrawer.classList.add('open');
            drawerBackdrop.classList.add('open');
            document.body.style.overflow = 'hidden';
            menuToggle.setAttribute('aria-expanded', 'true');
        });
    }

    if (drawerClose) {
        drawerClose.addEventListener('click', closeDrawer);
    }

    if (drawerBackdrop) {
        drawerBackdrop.addEventListener('click', closeDrawer);
    }

    function closeDrawer() {
        if (mobileDrawer) mobileDrawer.classList.remove('open');
        if (drawerBackdrop) drawerBackdrop.classList.remove('open');
        document.body.style.overflow = '';
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    }

    // Close drawer on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDrawer();
        }
    });

    // Close drawer when clicking a nav link
    document.querySelectorAll('.drawer-nav a').forEach(link => {
        link.addEventListener('click', closeDrawer);
    });
});

// ============================================================
// 3. SEARCH FUNCTIONALITY
// ============================================================
function setupSearch() {
    const searchToggle = document.getElementById('searchToggle');
    const searchOverlay = document.getElementById('searchOverlay');
    const searchClose = document.getElementById('searchClose');
    const searchInput = document.getElementById('searchInput');

    if (!searchToggle || !searchOverlay) return;

    searchToggle.addEventListener('click', function() {
        searchOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    });

    if (searchClose) {
        searchClose.addEventListener('click', closeSearch);
    }

    searchOverlay.addEventListener('click', function(e) {
        if (e.target === this) {
            closeSearch();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
            closeSearch();
        }
        // Ctrl+K to open search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchToggle.click();
        }
    });

    function closeSearch() {
        searchOverlay.classList.remove('active');
        document.body.style.overflow = '';
        if (searchInput) {
            searchInput.value = '';
            document.getElementById('searchResults').innerHTML = '';
        }
    }

    // Search input handler
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            if (query.length > 0) {
                searchTimeout = setTimeout(() => performSearch(query), 300);
            } else {
                document.getElementById('searchResults').innerHTML = '';
            }
        });
    }

    // Search tag clicks
    document.querySelectorAll('.search-tag').forEach(tag => {
        tag.addEventListener('click', function() {
            const query = this.dataset.query;
            if (searchInput) {
                searchInput.value = query;
                performSearch(query);
                searchInput.focus();
            }
        });
    });
}

async function performSearch(query) {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;

    try {
        // Load articles from Firebase if not already loaded
        if (allArticles.length === 0) {
            await loadDataFromFirebase();
        }
        
        // Filter articles
        const results = allArticles.filter(article => {
            const searchText = query.toLowerCase();
            return article.title?.toLowerCase().includes(searchText) ||
                   article.content?.toLowerCase().includes(searchText) ||
                   article.author?.toLowerCase().includes(searchText) ||
                   article.category?.toLowerCase().includes(searchText) ||
                   (article.tags && article.tags.some(t => t.toLowerCase().includes(searchText)));
        });

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search"></i>
                    <p>No results found for "<strong>${escapeHtml(query)}</strong>"</p>
                    <span>Try different keywords or browse our categories</span>
                </div>
            `;
            return;
        }

        let html = `<div class="search-results-list">`;
        results.slice(0, 10).forEach(article => {
            html += `
                <a href="public/article.html?id=${article.id}" class="search-result-item">
                    <div class="result-title">${escapeHtml(article.title)}</div>
                    <div class="result-meta">
                        <span><i class="fas fa-user"></i> ${escapeHtml(article.author)}</span>
                        <span><i class="fas fa-tag"></i> ${escapeHtml(article.category)}</span>
                        <span><i class="far fa-calendar"></i> ${escapeHtml(article.date || 'Recent')}</span>
                    </div>
                </a>
            `;
        });
        if (results.length > 10) {
            html += `<div class="search-more">+ ${results.length - 10} more results</div>`;
        }
        html += `</div>`;
        resultsContainer.innerHTML = html;
    } catch (error) {
        console.warn('Search error:', error);
        resultsContainer.innerHTML = `
            <div class="search-no-results">
                <i class="fas fa-exclamation-circle"></i>
                <p>Something went wrong. Please try again.</p>
            </div>
        `;
    }
}

// ============================================================
// 4. NEWSLETTER SUBSCRIPTION
// ============================================================
function setupNewsletter() {
    const forms = document.querySelectorAll('.newsletter-form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const input = this.querySelector('input[type="email"]');
            if (!input) return;
            
            const email = input.value.trim();
            
            if (!email) {
                showNotification('Please enter your email address.', 'error');
                input.focus();
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address.', 'error');
                input.focus();
                return;
            }
            
            // Simulate subscription
            showNotification('🎉 Thank you for subscribing! Check your email for confirmation.', 'success');
            this.reset();
        });
    });
}

// ============================================================
// 5. ARTICLE INTERACTIONS
// ============================================================

// Bookmark functionality
function setupBookmarks() {
    document.querySelectorAll('.card-bookmark, .hero-bookmark').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.toggle('far');
                icon.classList.toggle('fas');
            }
            if (this.classList.contains('active')) {
                showNotification('📌 Article bookmarked!', 'success');
            } else {
                showNotification('Bookmark removed.', 'info');
            }
        });
    });
}

// Share functionality
function setupShare() {
    // Share buttons on article page
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const platform = this.dataset.platform;
            const title = this.dataset.title || 'Digital Journal Article';
            const url = window.location.href;
            
            shareArticle(platform, url, title);
        });
    });

    // Hero share button
    const heroShare = document.getElementById('heroShare');
    if (heroShare) {
        heroShare.addEventListener('click', function() {
            const modal = document.getElementById('shareModal');
            if (modal) {
                modal.classList.add('active');
                const backdrop = document.getElementById('modalBackdrop');
                if (backdrop) backdrop.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    }

    // Share modal close
    const shareClose = document.getElementById('shareClose');
    if (shareClose) {
        shareClose.addEventListener('click', closeShareModal);
    }

    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', closeShareModal);
    }

    // Share modal buttons
    document.querySelectorAll('.share-modal .share-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const platform = this.dataset.platform;
            const url = document.getElementById('shareCopyInput')?.value || window.location.href;
            const title = document.querySelector('.article-detail-title')?.textContent || 'Digital Journal Article';
            
            shareArticle(platform, url, title);
            closeShareModal();
        });
    });

    // Copy link
    const copyBtn = document.getElementById('shareCopyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const input = document.getElementById('shareCopyInput');
            if (input) {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(input.value).then(() => {
                        showNotification('📋 Link copied to clipboard!', 'success');
                    }).catch(() => {
                        fallbackCopy(input);
                    });
                } else {
                    fallbackCopy(input);
                }
            }
        });
    }
}

function fallbackCopy(input) {
    input.select();
    try {
        document.execCommand('copy');
        showNotification('📋 Link copied to clipboard!', 'success');
    } catch (e) {
        showNotification('Could not copy link. Please copy it manually.', 'error');
    }
}

function closeShareModal() {
    const modal = document.getElementById('shareModal');
    const backdrop = document.getElementById('modalBackdrop');
    if (modal) modal.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
}

function shareArticle(platform, url, title) {
    const shareUrls = {
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offscreen/?url=${encodeURIComponent(url)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`
    };
    
    const shareUrl = shareUrls[platform];
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=500,scrollbars=yes,noopener,noreferrer');
    }
}

// ============================================================
// 6. COMMENTS SYSTEM
// ============================================================
function setupComments() {
    const commentForm = document.getElementById('commentForm');
    if (!commentForm) return;

    commentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('commentName')?.value.trim();
        const email = document.getElementById('commentEmail')?.value.trim();
        const text = document.getElementById('commentText')?.value.trim();

        if (!name || !email || !text) {
            showNotification('Please fill in all fields.', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showNotification('Please enter a valid email address.', 'error');
            return;
        }

        // Create new comment
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;

        const newComment = document.createElement('div');
        newComment.className = 'comment-item';
        newComment.style.animation = 'fadeIn 0.5s ease';
        newComment.innerHTML = `
            <div class="comment-avatar"><i class="fas fa-user-circle"></i></div>
            <div class="comment-body">
                <span class="comment-author">${escapeHtml(name)}</span>
                <span class="comment-date">Just now</span>
                <p class="comment-text">${escapeHtml(text)}</p>
                <div class="comment-actions">
                    <button class="comment-like" aria-label="Like comment"><i class="far fa-thumbs-up"></i> <span class="like-count">0</span></button>
                    <button class="comment-reply" aria-label="Reply to comment"><i class="far fa-reply"></i> Reply</button>
                </div>
            </div>
        `;

        commentsList.prepend(newComment);

        // Update comment count
        const count = commentsList.querySelectorAll('.comment-item:not(.reply .comment-item)').length;
        document.querySelectorAll('.comment-count').forEach(el => {
            el.textContent = count;
        });

        commentForm.reset();
        showNotification('Your comment has been posted!', 'success');
    });

    // Comment likes and replies (event delegation)
    document.addEventListener('click', function(e) {
        // Like button
        const likeBtn = e.target.closest('.comment-like');
        if (likeBtn) {
            const icon = likeBtn.querySelector('i');
            const countSpan = likeBtn.querySelector('.like-count');
            if (!icon || !countSpan) return;
            
            let count = parseInt(countSpan.textContent) || 0;

            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                count++;
                countSpan.textContent = count;
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                count--;
                countSpan.textContent = count;
            }
        }

        // Reply button
        const replyBtn = e.target.closest('.comment-reply');
        if (replyBtn) {
            const commentItem = replyBtn.closest('.comment-item');
            if (!commentItem) return;
            
            const authorName = commentItem.querySelector('.comment-author')?.textContent || 'User';
            const commentBody = commentItem.querySelector('.comment-body');
            if (!commentBody) return;
            
            let replyForm = commentBody.querySelector('.reply-form-inline');
            if (!replyForm) {
                replyForm = document.createElement('div');
                replyForm.className = 'reply-form-inline';
                replyForm.style.marginTop = '12px';
                replyForm.innerHTML = `
                    <textarea placeholder="Reply to ${escapeHtml(authorName)}..." style="width:100%;padding:8px 12px;border:1px solid #E8E0D5;border-radius:4px;font-family:'Inter',sans-serif;font-size:0.9rem;resize:vertical;min-height:50px;" aria-label="Reply text"></textarea>
                    <div style="margin-top:8px;display:flex;gap:8px;">
                        <button class="btn btn-primary btn-sm btn-post-reply" style="padding:6px 16px;font-size:0.8rem;">Reply</button>
                        <button class="btn btn-sm btn-cancel-reply" style="padding:6px 16px;font-size:0.8rem;background:transparent;border:1px solid #E8E0D5;border-radius:4px;cursor:pointer;">Cancel</button>
                    </div>
                `;
                commentBody.appendChild(replyForm);
                
                const textarea = replyForm.querySelector('textarea');
                if (textarea) {
                    textarea.focus();
                }

                replyForm.querySelector('.btn-post-reply').addEventListener('click', function() {
                    const replyText = textarea?.value.trim();
                    if (!replyText) {
                        showNotification('Please enter a reply.', 'error');
                        return;
                    }

                    let replyContainer = commentItem.querySelector('.reply');
                    if (!replyContainer) {
                        replyContainer = document.createElement('div');
                        replyContainer.className = 'reply';
                        commentItem.appendChild(replyContainer);
                    }

                    const newReply = document.createElement('div');
                    newReply.className = 'comment-item';
                    newReply.style.animation = 'fadeIn 0.5s ease';
                    newReply.innerHTML = `
                        <div class="comment-avatar"><i class="fas fa-user-circle"></i></div>
                        <div class="comment-body">
                            <span class="comment-author">You</span>
                            <span class="comment-date">Just now</span>
                            <p class="comment-text">${escapeHtml(replyText)}</p>
                            <div class="comment-actions">
                                <button class="comment-like" aria-label="Like reply"><i class="far fa-thumbs-up"></i> <span class="like-count">0</span></button>
                            </div>
                        </div>
                    `;

                    replyContainer.appendChild(newReply);
                    replyForm.remove();
                    showNotification('Your reply has been posted!', 'success');
                });

                replyForm.querySelector('.btn-cancel-reply').addEventListener('click', function() {
                    replyForm.remove();
                });
            } else {
                replyForm.remove();
            }
        }
    });
}

// ============================================================
// 7. BACK TO TOP BUTTON
// ============================================================
function setupBackToTop() {
    const button = document.getElementById('backToTop');
    if (!button) return;

    let isVisible = false;

    window.addEventListener('scroll', function() {
        const shouldBeVisible = window.scrollY > 400;
        if (shouldBeVisible !== isVisible) {
            isVisible = shouldBeVisible;
            button.classList.toggle('visible', isVisible);
        }
    }, { passive: true });

    button.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ============================================================
// 8. SMOOTH SCROLL FOR INTERNAL LINKS
// ============================================================
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '' || href === 'javascript:void(0)') return;
            
            try {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const headerOffset = 80;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            } catch (error) {
                // Ignore invalid selectors
            }
        });
    });
}

// ============================================================
// 9. HELPER FUNCTIONS
// ============================================================

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ============================================================
// 10. NOTIFICATION SYSTEM
// ============================================================
function showNotification(message, type = 'info', duration = 4000) {
    // Remove existing notification
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    const icon = icons[type] || icons.info;
    
    notification.innerHTML = `
        <i class="fas ${icon}" aria-hidden="true"></i>
        <span>${escapeHtml(message)}</span>
        <button class="notification-close" aria-label="Close notification">&times;</button>
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

    // Use requestAnimationFrame for smooth animation
    requestAnimationFrame(() => {
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
    });

    // Auto remove
    const timeoutId = setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.transform = 'translateY(120px)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 400);
        }
    }, duration);

    // Store timeout ID for cleanup
    notification.dataset.timeoutId = timeoutId;
}

// ============================================================
// 11. DATA ACCESS FUNCTIONS (FIREBASE)
// ============================================================

// Get all published articles
function getPublishedArticles() {
    return allArticles.filter(a => a.status === 'published');
}

// Get article by ID
async function getArticleById(id) {
    try {
        const docRef = doc(db, "articles", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.status === 'published') {
                return { id: docSnap.id, ...data };
            }
        }
        return null;
    } catch (error) {
        console.error('Error getting article:', error);
        return null;
    }
}

// Get articles by category
function getArticlesByCategory(category) {
    return allArticles.filter(a => a.category === category && a.status === 'published');
}

// Get recent articles
function getRecentArticles(limit = 6) {
    const articles = getPublishedArticles();
    return articles.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date);
        const dateB = new Date(b.createdAt || b.date);
        return dateB - dateA;
    }).slice(0, limit);
}

// Get contributors
function getContributors() {
    return allContributors;
}

// Get categories
function getCategories() {
    return allCategories;
}

// ============================================================
// 12. ANIMATION ON SCROLL (Intersection Observer)
// ============================================================
function setupScrollAnimations() {
    const elements = document.querySelectorAll('[data-aos]');
    if (elements.length === 0) return;

    if (!('IntersectionObserver' in window)) {
        // Fallback for older browsers
        elements.forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    elements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// ============================================================
// 13. ADD FADE IN ANIMATION
// ============================================================
function addFadeAnimation() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
}

// ============================================================
// 14. CONSOLE WELCOME
// ============================================================
function consoleWelcome() {
    const styles = {
        title: 'font-size:24px;font-weight:bold;color:#2C3E50;',
        subtitle: 'font-size:14px;color:#4A6A7A;',
        info: 'font-size:12px;color:#7F8C8D;',
        accent: 'font-size:12px;color:#B8945C;'
    };
    
    console.log('%c📖 Digital Journal', styles.title);
    console.log('%cThoughtful Writing on Society & Governance', styles.subtitle);
    console.log('%c🔥 Using Firebase Database', styles.accent);
    console.log('%cBuilt with ❤️ for thoughtful discourse.', styles.info);
    
    const articles = getPublishedArticles();
    console.log(`%c📝 ${articles.length} articles published`, styles.accent);
}

// ============================================================
// 15. INITIALIZE EVERYTHING
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
    // Load data from Firebase
    await loadDataFromFirebase();
    
    // Mobile menu - already initialized at top
    
    // Search
    setupSearch();
    
    // Newsletter
    setupNewsletter();
    
    // Article interactions
    setupBookmarks();
    setupShare();
    
    // Comments
    setupComments();
    
    // Back to top
    setupBackToTop();
    
    // Smooth scroll
    setupSmoothScroll();
    
    // Scroll animations
    setupScrollAnimations();
    
    // Add fade animation
    addFadeAnimation();
    
    // Console welcome
    consoleWelcome();
});

// ============================================================
// 16. EXPOSE FUNCTIONS GLOBALLY
// ============================================================
window.showNotification = showNotification;
window.shareArticle = shareArticle;
window.getPublishedArticles = getPublishedArticles;
window.getArticleById = getArticleById;
window.getRecentArticles = getRecentArticles;
window.getContributors = getContributors;
window.getCategories = getCategories;
window.isValidEmail = isValidEmail;
window.escapeHtml = escapeHtml;
window.debounce = debounce;
window.loadDataFromFirebase = loadDataFromFirebase;

console.log('%c✅ Public JavaScript Loaded Successfully (Firebase)', 'font-size:14px;color:#4CAF50;');