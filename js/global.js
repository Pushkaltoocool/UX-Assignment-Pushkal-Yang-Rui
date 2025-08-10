// Pushkal & Rui: This file handles navigation, theme, and global features for the site.
import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Rui: Waits for the page to load, then sets up everything.
document.addEventListener('DOMContentLoaded', function () {
    initThemeToggler();
    initAOS();
    initNavActiveState();
    displayActiveAnnouncements();
});

// Pushkal: Shows announcements if there are any active ones.
async function displayActiveAnnouncements() {
    // Rui: Lets users close the announcement banner and remembers it.
    if (sessionStorage.getItem('announcementDismissed')) {
        return;
    }

    const bannerContainer = document.createElement('div');
    document.body.prepend(bannerContainer);

    try {
        const now = Timestamp.now();
        const q = query(
            collection(db, "announcements"),
            where("startTime", "<=", now),
            where("endTime", ">=", now),
            orderBy("startTime", "desc")
        );

        const snapshot = await getDocs(q);
        const announcements = snapshot.docs.map(doc => doc.data());

        if (announcements.length > 0) {
            let itemsHtml = '';
            announcements.forEach((ann, index) => {
                const content = ann.link
                    ? `<a href="${ann.link}" target="_blank" rel="noopener noreferrer">${ann.text}</a>`
                    : ann.text;
                itemsHtml += `<div class="announcement-item ${index === 0 ? 'active' : ''}">${content}</div>`;
            });

            bannerContainer.innerHTML = `
                <div class="announcement-banner">
                    <div class="announcement-content">${itemsHtml}</div>
                    <button class="close-announcement" aria-label="Close">×</button>
                </div>`;

            const banner = bannerContainer.querySelector('.announcement-banner');

            banner.querySelector('.close-announcement').addEventListener('click', () => {
                banner.style.display = 'none';
                sessionStorage.setItem('announcementDismissed', 'true');
            });

            if (announcements.length > 1) {
                const items = banner.querySelectorAll('.announcement-item');
                let currentIndex = 0;
                setInterval(() => {
                    items[currentIndex].classList.remove('active');
                    currentIndex = (currentIndex + 1) % items.length;
                    items[currentIndex].classList.add('active');
                }, 5000);
            }
        }
    } catch (error) {
        console.error("Error fetching announcements:", error);
    }
}

// Pushkal: Handles the theme toggle button (light/dark mode).
function initThemeToggler() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const sunIcon = '<i class="bi bi-sun-fill"></i>';
    const moonIcon = '<i class="bi bi-moon-fill"></i>';

    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.innerHTML = (currentTheme === 'dark') ? sunIcon : moonIcon;

    themeToggle.addEventListener('click', () => {
        let newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggle.innerHTML = (newTheme === 'dark') ? sunIcon : moonIcon;
    });
}

// Rui: Animates elements on scroll if AOS is loaded.
function initAOS() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
        });
    }
}

// Pushkal: Highlights the current page in the navbar.
function initNavActiveState() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}