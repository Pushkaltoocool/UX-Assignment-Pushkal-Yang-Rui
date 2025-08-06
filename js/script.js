import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


document.addEventListener('DOMContentLoaded', function() {
    
    initThemeToggler();
    initAOS();
    initNavActiveState();
    displayActiveAnnouncements(); 

    if (document.getElementById('calendar-container')) {
        initEventsPage();
    }
    if (document.getElementById('animated-thumbnails')) {
        initGalleryPage();
    }
    if (document.getElementById('application-form')) {
        initApplicationForm();
    }
    if (document.getElementById('contact-form')) {
        initContactForm();
    }
});


async function displayActiveAnnouncements() {
    // If the user has closed the banner in this browser session, don't show it again.
    if (sessionStorage.getItem('announcementDismissed')) {
        return;
    }
    
    // Create a container for the banner and add it to the top of the body.
    const bannerContainer = document.createElement('div');
    document.body.prepend(bannerContainer);

    try {
        const now = Timestamp.now();
        // Query Firestore for announcements that are currently active.
        const q = query(
            collection(db, "announcements"),
            where("startTime", "<=", now), // Start time is in the past
            where("endTime", ">=", now),   // End time is in the future
            orderBy("startTime", "desc")   // Show newest ones first if multiple
        );

        const snapshot = await getDocs(q);
        const announcements = snapshot.docs.map(doc => doc.data());

        // If there are any active announcements, build the banner HTML.
        if (announcements.length > 0) {
            let itemsHtml = '';
            announcements.forEach((ann, index) => {
                // If the announcement has a link, make the text clickable.
                const content = ann.link 
                    ? `<a href="${ann.link}" target="_blank" rel="noopener noreferrer">${ann.text}</a>` 
                    : ann.text;
                // The first item is 'active' to be visible, others are hidden for the slideshow.
                itemsHtml += `<div class="announcement-item ${index === 0 ? 'active' : ''}">${content}</div>`;
            });

            // Construct the announcement banner
            bannerContainer.innerHTML = `
                <div class="announcement-banner">
                    <div class="announcement-content">${itemsHtml}</div>
                    <button class="close-announcement" aria-label="Close">×</button>
                </div>`;

            const banner = bannerContainer.querySelector('.announcement-banner');
            
            // Close button logic
            banner.querySelector('.close-announcement').addEventListener('click', () => {
                banner.style.display = 'none';
                // Store the dismissed state so it doesn't reappear on page navigation.
                sessionStorage.setItem('announcementDismissed', 'true');
            });

            // If there's more than one announcement, create a simple slideshow.
            if (announcements.length > 1) {
                const items = banner.querySelectorAll('.announcement-item');
                let currentIndex = 0;
                setInterval(() => {
                    items[currentIndex].classList.remove('active');
                    currentIndex = (currentIndex + 1) % items.length;
                    items[currentIndex].classList.add('active');
                }, 5000); // Change announcement every 5 seconds.
            }
        }
    } catch (error) {
        console.error("Error fetching announcements:", error);
    }
}


//Light Mode - Dark Mode logic
function initThemeToggler() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const sunIcon = '<i class="bi bi-sun-fill"></i>';
    const moonIcon = '<i class="bi bi-moon-fill"></i>';
    
    // Get theme from localStorage or default to 'light'.
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.innerHTML = (currentTheme === 'dark') ? sunIcon : moonIcon;

    // Add click listener to toggle the theme.
    themeToggle.addEventListener('click', () => {
        let newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggle.innerHTML = (newTheme === 'dark') ? sunIcon : moonIcon;
    });
}

//Animate on scroll JS library
function initAOS() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
        });
    }
}


function initNavActiveState() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

//Events page
function initEventsPage() {
    const calendarEl = document.getElementById('calendar-container');
    const eventTableBody = document.querySelector('#event-details-table tbody');

    const loadAndDisplayEvents = async () => {
        eventTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Fetching events...</td></tr>';
        try {
            const q = query(collection(db, "events"), orderBy("date", "asc"));
            const snapshot = await getDocs(q);
            const events = snapshot.docs.map(doc => doc.data());
            renderTable(events);
            renderFullCalendar(events);
        } catch (error) {
            console.error("Firebase Fetch Error:", error);
            eventTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger"><strong>Error:</strong> Could not load events.</td></tr>`;
            calendarEl.innerHTML = `<div class="alert alert-danger">Could not load calendar.</div>`;
        }
    };

    const renderTable = (events) => {
        eventTableBody.innerHTML = ''; 
        if (events.length === 0) {
            eventTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No upcoming events scheduled.</td></tr>';
            return;
        }
        events.forEach(event => {
            const eventDate = new Date(event.date + 'T00:00:00');
            eventTableBody.innerHTML += `<tr>
                <td>${event.title}</td>
                <td>${eventDate.toLocaleDateString('en-SG', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                <td>${event.time}</td>
                <td>${event.location}</td>
                <td>${event.description}</td>
            </tr>`;
        });
    };

    const renderFullCalendar = (events) => {
        if (typeof FullCalendar !== 'undefined') {
            const calendar = new FullCalendar.Calendar(calendarEl, {
                themeSystem: 'bootstrap5',
                headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' },
                initialView: 'dayGridMonth',
                events: events 
            });
            calendar.render();
        }
    };

    loadAndDisplayEvents();
}

//Fetching images from Firestore and displaying
async function initGalleryPage() {
    const galleryContainer = document.getElementById('animated-thumbnails');
    if (!galleryContainer) return;

    // Show a loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'col-12 text-center';
    loadingIndicator.textContent = 'Loading gallery...';
    galleryContainer.prepend(loadingIndicator);

    try {
        // Fetch images from Firestore
        const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const imagesHtml = snapshot.docs.map(doc => {
            const item = doc.data();
            return `

                <a href="${item.url}" class="gallery-item grid-item" data-category="image">
                    <div class="gallery-image-container">
                        <img src="${item.url}" alt="${item.description}">
                        <div class="gallery-overlay">
                            <p class="overlay-text">${item.description}</p>
                        </div>
                    </div>
                </a>
            `;
        }).join('');
        
        // Remove loading indicator and add the new images
        loadingIndicator.remove();
        galleryContainer.insertAdjacentHTML('afterbegin', imagesHtml);

    } catch (error) {
        console.error("Error fetching gallery images:", error);
        loadingIndicator.textContent = 'Error loading gallery.';
        loadingIndicator.classList.add('text-danger');
    }

    // Initialize lightbox after content is loaded
    if (typeof lightGallery !== 'undefined') {
        lightGallery(galleryContainer, {
            selector: '.gallery-item',
            thumbnail: true,
            download: false
        });
    }

    // Add click listeners to filter buttons
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.replace('btn-primary', 'btn-outline-primary'));
            button.classList.replace('btn-outline-primary', 'btn-primary');
            
            const filter = button.dataset.filter;

            document.querySelectorAll('.gallery-item').forEach(item => {
                // The item itself is the column, so we show/hide it.
                item.style.display = 'none';
                if (filter === 'all' || item.dataset.category === filter) {
                    item.style.display = 'block';
                }
            });
             if (typeof AOS !== 'undefined') {
                AOS.refresh();
             }
        });
    });
}


//Join Us application form
function initApplicationForm() {
    const applicationForm = document.getElementById('application-form');
    
    // Dynamically populate the audition slots dropdown
    const auditionSlotSelect = document.getElementById('audition_slot');
    if (auditionSlotSelect) {
        function formatSlot(date) {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            return {
                value: `${yyyy}-${mm}-${dd}T${hh}:${min}`,
                label: `${date.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })} @ ${hh}:${min}`
            };
        }

        const slots = [];
        let friday = new Date();
        // Find the next upcoming Friday
        friday.setDate(friday.getDate() + (5 - friday.getDay() + 7) % 7);

        // Generate slots for the next 4 Fridays
        for (let week = 0; week < 4; week++) {
            // Slots from 5:00 PM to 7:30 PM every 30 minutes
            for (let t = 17; t <= 19; t++) { 
                for (let min = 0; min < 60; min += 30) {
                    const slot = new Date(friday);
                    slot.setHours(t, min, 0, 0);
                    slots.push(formatSlot(slot));
                }
            }
            // Move to the next Friday
            friday.setDate(friday.getDate() + 7);
        }
        
        // Populate dropdown with generated slots
        slots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot.value;
            option.textContent = slot.label;
            auditionSlotSelect.appendChild(option);
        });
    }
    
    // Handle form submission with EmailJS
    applicationForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (typeof emailjs === 'undefined') {
            alert('Email service is currently unavailable.');
            return;
        }
        
        const serviceID = 'service_tfyce8f'; 
        const templateID = 'template_drttt8h'; // Template for APPLICATIONS
        const publicKey = 'hR23SDttfQyG0mOCi';

        const submitButton = applicationForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Submitting...`;

        emailjs.sendForm(serviceID, templateID, this, publicKey)
            .then(() => {
                window.location.href = 'thankyou.html'; // Redirect on success
            }, 
            (err) => {
                console.error('EmailJS Error:', err);
                alert('Failed to submit application. Please try again later.');
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            });
    });
}

/**
 * Initializes the general contact form.
 */
function initContactForm() {
    const contactForm = document.getElementById('contact-form');

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (typeof emailjs === 'undefined') {
            alert('Email service is currently unavailable.');
            return;
        }
        
        const serviceID = 'service_tfyce8f'; 
        const templateID = 'template_contact_form';
        const publicKey = 'hR23SDttfQyG0mOCi';

        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Sending...`;

        emailjs.sendForm(serviceID, templateID, this, publicKey)
            .then(() => {
                window.location.href = 'thankyou.html';
            },
            (err) => {
                console.error('EmailJS Error:', err);
                alert('Failed to send message. Please try again later.');
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            });
    });
}