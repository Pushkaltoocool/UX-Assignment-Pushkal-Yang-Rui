// /js/gallery.js
import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    initGalleryPage();
});

async function initGalleryPage() {
    const galleryContainer = document.getElementById('animated-thumbnails');
    if (!galleryContainer) return;

    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'col-12 text-center';
    loadingIndicator.textContent = 'Loading gallery...';
    galleryContainer.prepend(loadingIndicator);

    try {
        const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        const fragment = document.createDocumentFragment();
        const newItems = [];

        snapshot.docs.forEach(doc => {
            const item = doc.data();
            const a = document.createElement('a');
            a.href = item.url;
            a.className = 'gallery-item grid-item';
            a.dataset.category = 'photo';
            a.innerHTML = `
                <div class="gallery-image-container">
                    <img src="${item.url}" alt="${item.description}">
                    <div class="gallery-overlay">
                        <p class="overlay-text">${item.description}</p>
                    </div>
                </div>
            `;
            fragment.appendChild(a);
            newItems.push(a);
        });
        
        loadingIndicator.remove();
        galleryContainer.appendChild(fragment);

        imagesLoaded(galleryContainer, function() {
            if (window.msnry) {
                window.msnry.appended(newItems);
                window.msnry.layout();
            }
        });

    } catch (error) {
        console.error("Error fetching gallery images:", error);
        loadingIndicator.textContent = 'Error loading gallery.';
        loadingIndicator.classList.add('text-danger');
    }

    if (typeof lightGallery !== 'undefined') {
        lightGallery(galleryContainer, {
            selector: '.gallery-item',
            thumbnail: true,
            download: false
        });
    }

    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.replace('btn-primary', 'btn-outline-primary'));
            button.classList.replace('btn-outline-primary', 'btn-primary');
            
            const filter = button.dataset.filter;

            document.querySelectorAll('.grid-item').forEach(item => {
                const category = item.dataset.category || 'photo'; // Default to photo if not set
                 if (filter === 'all' || category === filter) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
            
            if (window.msnry) {
                window.msnry.layout();
            }
        });
    });
}