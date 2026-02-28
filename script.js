const firebaseConfig = {
  apiKey: "AIzaSyD9Ob1dG1UEhbMJJ-oEoO6TDVIf2_6jGX8",
  authDomain: "paperwall-app-20003.firebaseapp.com",
  projectId: "paperwall-app-20003",
  storageBucket: "paperwall-app-20003.firebasestorage.app",
  messagingSenderId: "250548215752",
  appId: "1:250548215752:web:f3016478ff8fa1531aeafd"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const ADMIN_PASSWORD = "YourSecret123";
const CLOUD_NAME = "ddpn4y3bz";

document.addEventListener("DOMContentLoaded", function() {
    const postBtn = document.getElementById("postBtn");
    const postText = document.getElementById("postText");
    const feed = document.getElementById("feed");
    const commentModal = document.getElementById("commentModal");
    const closeModal = document.getElementById("closeModal");
    const modalComments = document.getElementById("modalComments");
    const modalCommentInput = document.getElementById("modalCommentInput");
    const modalCommentBtn = document.getElementById("modalCommentBtn");
    const welcomeModal = document.getElementById("welcomeModal");
    const closeWelcome = document.getElementById("closeWelcome");
    const acceptWelcome = document.getElementById("acceptWelcome");
    const searchInput = document.getElementById("searchInput");
    const imageInput = document.getElementById("imageInput");
    const fileName = document.getElementById("fileName");

    let currentPostId = null;
    let currentImageUrl = null;

    welcomeModal.style.display = "flex";
    
    closeWelcome.onclick = function() {
        welcomeModal.style.display = "none";
    };
    
    acceptWelcome.onclick = function() {
        welcomeModal.style.display = "none";
    };

    function timeAgo(date) {
        if(!date) return "";
        const now = new Date();
        const diff = Math.floor((now - date.toDate()) / 1000);
        if (diff < 60) return "Just now";
        if (diff < 3600) return Math.floor(diff/60) + " min ago";
        if (diff < 86400) return Math.floor(diff/3600) + " hr ago";
        return date.toDate().toLocaleDateString();
    }

    imageInput.addEventListener("change", function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 5000000) {
            alert("Image too large. Please choose an image under 5MB.");
            imageInput.value = "";
            fileName.textContent = "";
            return;
        }
        
        fileName.textContent = "Uploading...";
        
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "paperwall_unsigned");
        
        fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.secure_url) {
                currentImageUrl = data.secure_url;
                fileName.textContent = "✓ Image ready";
            } else {
                alert("Upload failed");
                currentImageUrl = null;
                fileName.textContent = "";
            }
        })
        .catch(function() {
            alert("Upload failed");
            currentImageUrl = null;
            fileName.textContent = "";
        });
    });

    postBtn.addEventListener("click", async function() {
        const text = postText.value.trim();
        if (!text && !currentImageUrl) return;

        try {
            const postData = {
                text: text || "",
                likes: 0,
                comments: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (currentImageUrl) {
                postData.imageUrl = currentImageUrl;
            }
            
            await db.collection("posts").add(postData);
            postText.value = "";
            imageInput.value = "";
            fileName.textContent = "";
            currentImageUrl = null;
        } catch(err) {
            console.error("Error posting:", err);
            alert("Failed to post. Please try again.");
        }
    });

    db.collection("posts").orderBy("createdAt","desc").onSnapshot(function(snapshot) {
        const postsArray = [];
        snapshot.forEach(function(doc) {
            const post = doc.data();
            post.id = doc.id;
            postsArray.push(post);
        });
        renderPosts(postsArray);
    });

    function renderPosts(postsArray) {
        feed.innerHTML = "";
        const likedPosts = JSON.parse(localStorage.getItem("likedPosts") || "[]");

        postsArray.forEach(function(post) {
            const postDiv = document.createElement("div");
            postDiv.className = "post";
            postDiv.setAttribute("data-post-id", post.id);

            const likedClass = likedPosts.includes(post.id) ? "liked" : "";
            
            let imageHtml = "";
            if (post.imageUrl) {
                imageHtml = `<img src="${post.imageUrl}" alt="Post image" class="post-image" loading="lazy">`;
            }

            postDiv.innerHTML = `
                <div class="post-header">
                    <ion-icon name="person-circle-outline"></ion-icon>
                    <span>Anonymous${post.id.slice(-4)}</span>
                </div>
                ${imageHtml}
                <p>${post.text}</p>
                <div class="timestamp">${timeAgo(post.createdAt)}</div>
                <div class="post-actions">
                    <button class="action-btn like-btn ${likedClass}" data-action="like">
                        <ion-icon name="${likedPosts.includes(post.id) ? "heart" : "heart-outline"}"></ion-icon>
                        <span>${post.likes || 0}</span>
                    </button>
                    <button class="action-btn" data-action="comment">
                        <ion-icon name="chatbubble-outline"></ion-icon>
                        <span>${post.comments ? post.comments.length : 0}</span>
                    </button>
                    <button class="action-btn" data-action="share">
                        <ion-icon name="share-outline"></ion-icon>
                    </button>
                    <button class="action-btn" data-action="delete">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                </div>
            `;
            feed.appendChild(postDiv);
        });
    }

    function handlePostAction(e) {
        const target = e.target;
        const actionBtn = target.closest(".action-btn");
        
        if (!actionBtn) return;
        
        e.preventDefault();
        
        const postDiv = actionBtn.closest(".post");
        if (!postDiv) return;
        
        const postId = postDiv.getAttribute("data-post-id");
        const action = actionBtn.getAttribute("data-action");
        
        if (action === "like") likePost(postId, actionBtn);
        if (action === "comment") openComments(postId);
        if (action === "share") sharePost();
        if (action === "delete") deletePost(postId);
    }

    document.addEventListener("click", handlePostAction);
    document.addEventListener("touchstart", handlePostAction, { passive: false });

    async function likePost(id, btn) {
        let likedPosts = JSON.parse(localStorage.getItem("likedPosts") || "[]");
        
        if (likedPosts.includes(id)) {
            alert("You already liked this post!");
            return;
        }

        const countSpan = btn.querySelector("span");
        const currentCount = countSpan ? parseInt(countSpan.textContent) : 0;
        const icon = btn.querySelector("ion-icon");
        
        countSpan.textContent = currentCount + 1;
        icon.setAttribute("name", "heart");
        btn.classList.add("liked");

        likedPosts.push(id);
        localStorage.setItem("likedPosts", JSON.stringify(likedPosts));

        try {
            await db.collection("posts").doc(id).update({
                likes: firebase.firestore.FieldValue.increment(1)
            });
        } catch(err) {
            console.error("Error liking post:", err);
            countSpan.textContent = currentCount;
            icon.setAttribute("name", "heart-outline");
            btn.classList.remove("liked");
            likedPosts = likedPosts.filter(postId => postId !== id);
            localStorage.setItem("likedPosts", JSON.stringify(likedPosts));
            alert("Failed to like post");
        }
    }

    function openComments(id) {
        currentPostId = id;
        commentModal.style.display = "flex";
        modalComments.innerHTML = "<p style='color:#888;'>Loading comments...</p>";

        db.collection("posts").doc(id).get().then(function(doc) {
            const post = doc.data();
            modalComments.innerHTML = "";
            
            if (post.comments && post.comments.length > 0) {
                post.comments.forEach(function(c) {
                    const div = document.createElement("div");
                    div.className = "comment";
                    div.innerHTML = `<ion-icon name="person-circle-outline"></ion-icon> <span>Anonymous: ${c}</span>`;
                    modalComments.appendChild(div);
                });
            } else {
                modalComments.innerHTML = "<p style='color:#888;'>No comments yet</p>";
            }
        }).catch(function(err) {
            console.error("Error loading comments:", err);
            modalComments.innerHTML = "<p style='color:#888;'>Error loading comments</p>";
        });
    }

    closeModal.onclick = function() {
        commentModal.style.display = "none";
    };
    
    modalCommentBtn.onclick = async function() {
        const text = modalCommentInput.value.trim();
        if (!text) return;

        try {
            await db.collection("posts").doc(currentPostId).update({
                comments: firebase.firestore.FieldValue.arrayUnion(text)
            });
            modalCommentInput.value = "";
            openComments(currentPostId);
        } catch(err) {
            console.error("Error adding comment:", err);
            alert("Failed to add comment");
        }
    };

    function sharePost() {
        if (navigator.share) {
            navigator.share({
                title: 'PaperWall Post',
                text: 'Check out this anonymous post',
                url: window.location.href
            }).catch(function(err) {
                if (err.name !== 'AbortError') {
                    fallbackShare();
                }
            });
        } else {
            fallbackShare();
        }
    }

    function fallbackShare() {
        navigator.clipboard.writeText(window.location.href).then(function() {
            alert("Link copied to clipboard!");
        }).catch(function() {
            prompt("Copy this link:", window.location.href);
        });
    }

    async function deletePost(id) {
        const pass = prompt("Enter admin password to delete this post:");
        if (pass !== ADMIN_PASSWORD) {
            alert("Wrong password!");
            return;
        }
        
        try {
            await db.collection("posts").doc(id).delete();
            alert("Post deleted successfully!");
        } catch(err) {
            console.error("Error deleting post:", err);
            alert("Failed to delete post");
        }
    }

    let searchTimeout;
    searchInput.addEventListener("input", function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function() {
            const query = searchInput.value.toLowerCase();
            db.collection("posts").orderBy("createdAt","desc").get().then(function(snapshot) {
                const postsArray = [];
                snapshot.forEach(function(doc) {
                    const post = doc.data();
                    post.id = doc.id;
                    if (post.text.toLowerCase().includes(query)) {
                        postsArray.push(post);
                    }
                });
                renderPosts(postsArray);
            }).catch(function(err) {
                console.error("Search error:", err);
            });
        }, 300);
    });

    window.addEventListener("click", function(e) {
        if (e.target === commentModal) {
            commentModal.style.display = "none";
        }
        if (e.target === welcomeModal) {
            welcomeModal.style.display = "none";
        }
    });

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('PaperWall can now be installed as an app!'))
            .catch(err => console.log('Service worker failed:', err));
    });
}
  
});
