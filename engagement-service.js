// Public/engagement-service.js

import { 
    db, 
    auth,
    collection, 
    doc, 
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    runTransaction,
    increment,
    arrayRemove,
    serverTimestamp
} from '../firebase-config.js';

// ===== LIKE =====
export async function toggleLike(articleId) {
    const user = auth.currentUser;
    if (!user) throw new Error("Please login");

    const articleRef = doc(db, 'articles', articleId);
    const userId = user.uid;

    await runTransaction(db, async (transaction) => {
        const articleDoc = await transaction.get(articleRef);
        if (!articleDoc.exists()) throw new Error("Article not found");

        const data = articleDoc.data();
        const currentLikes = data.likesCount || 0;
        const likedBy = data.likedBy || {};

        if (likedBy[userId]) {
            transaction.update(articleRef, {
                likesCount: currentLikes - 1,
                [`likedBy.${userId}`]: arrayRemove(userId)
            });
        } else {
            transaction.update(articleRef, {
                likesCount: currentLikes + 1,
                [`likedBy.${userId}`]: userId
            });
        }
    });
    return true;
}

export function subscribeToLikes(articleId, callback) {
    const articleRef = doc(db, 'articles', articleId);
    return onSnapshot(articleRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            callback({
                count: data.likesCount || 0,
                currentUserLiked: data.likedBy ? !!data.likedBy[auth.currentUser?.uid] : false
            });
        }
    });
}

// ===== COMMENTS =====
export async function addComment(articleId, content, parentCommentId = null) {
    const user = auth.currentUser;
    if (!user) throw new Error("Please login");

    const commentData = {
        articleId,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || null,
        content,
        createdAt: serverTimestamp(),
        parentCommentId: parentCommentId || null,
        likesCount: 0,
        repliesCount: 0,
        likedBy: {}
    };

    const docRef = await addDoc(collection(db, 'comments'), commentData);
    
    const articleRef = doc(db, 'articles', articleId);
    await updateDoc(articleRef, { commentsCount: increment(1) });

    if (parentCommentId) {
        const parentCommentRef = doc(db, 'comments', parentCommentId);
        await updateDoc(parentCommentRef, { repliesCount: increment(1) });
    }

    return { id: docRef.id, ...commentData };
}

export async function deleteComment(commentId, articleId, parentCommentId = null) {
    const user = auth.currentUser;
    if (!user) return;

    const commentRef = doc(db, 'comments', commentId);
    const commentDoc = await getDoc(commentRef);
    if (!commentDoc.exists() || commentDoc.data().authorId !== user.uid) {
        throw new Error("You can only delete your own comments");
    }

    await deleteDoc(commentRef);
    
    const articleRef = doc(db, 'articles', articleId);
    await updateDoc(articleRef, { commentsCount: increment(-1) });

    if (parentCommentId) {
        const parentCommentRef = doc(db, 'comments', parentCommentId);
        await updateDoc(parentCommentRef, { repliesCount: increment(-1) });
    }
}

export async function likeComment(commentId) {
    const user = auth.currentUser;
    if (!user) throw new Error("Please login");

    const commentRef = doc(db, 'comments', commentId);
    const userId = user.uid;

    await runTransaction(db, async (transaction) => {
        const commentDoc = await transaction.get(commentRef);
        if (!commentDoc.exists()) throw new Error('Comment not found');

        const data = commentDoc.data();
        const currentLikes = data.likesCount || 0;
        const likedBy = data.likedBy || {};

        if (likedBy[userId]) {
            transaction.update(commentRef, {
                likesCount: currentLikes - 1,
                [`likedBy.${userId}`]: arrayRemove(userId)
            });
        } else {
            transaction.update(commentRef, {
                likesCount: currentLikes + 1,
                [`likedBy.${userId}`]: userId
            });
        }
    });
}

export function subscribeToComments(articleId, callback) {
    const commentsRef = collection(db, 'comments');
    const q = query(
        commentsRef,
        where('articleId', '==', articleId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const comments = [];
        snapshot.forEach((doc) => {
            comments.push({ id: doc.id, ...doc.data() });
        });
        callback(comments);
    });
}

// ===== SHARE =====
export async function trackShare(articleId) {
    const articleRef = doc(db, 'articles', articleId);
    await updateDoc(articleRef, { sharesCount: increment(1) });
}

export function shareOnSocial(platform, articleId, title) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${articleId}`;
    
    const shareLinks = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + shareUrl)}`,
    };

    if (platform === 'copy') {
        return navigator.clipboard.writeText(`${title}\n${shareUrl}`);
    }

    const link = shareLinks[platform];
    if (link) {
        window.open(link, '_blank', 'width=600,height=500');
        return Promise.resolve();
    }
    return Promise.reject(new Error('Invalid platform'));
}