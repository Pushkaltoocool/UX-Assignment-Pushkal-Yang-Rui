// js/script.js

// Import the database connection from your config file to be used for the events page
import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


document.addEventListener('DOMContentLoaded', function() {

    // 1. THEME TOGGLER (Light/Dark Mode)
    // -------------------------------------------------------------------------
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const sunIcon = '<i class="bi bi-sun-fill"></i>';
        const moonIcon = '<i class="bi bi-moon-fill"></i>';
        const currentTheme = localStorage.getItem('theme');

        if (currentTheme) {
            document.documentElement.setAttribute('data-theme', currentTheme);
            themeToggle.innerHTML = (currentTheme === 'dark') ? sunIcon : moonIcon;
        } else {
            // Default to light theme if no preference is saved
            document.documentElement.setAttribute('data-theme', 'light');
            themeToggle.innerHTML = moonIcon;
        }

        themeToggle.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                themeToggle.innerHTML = moonIcon;
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeToggle.innerHTML = sunIcon;
            }
        });
    }

    // 2. INITIALIZE AOS (Animate on Scroll)
    // -------------------------------------------------------------------------
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
        });
    }

    // 3. NAVIGATION ACTIVE STATE
    // -------------------------------------------------------------------------
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });

    // EVENTS PAGE LOGIC (with FullCalendar)
    // -------------------------------------------------------------------------
    const calendarEl = document.getElementById('calendar-container');
    const eventTableBody = document.querySelector('#event-details-table tbody');

    if (calendarEl && eventTableBody) {
        
        const loadAndDisplayEvents = async () => {
            eventTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Fetching events...</td></tr>';
            
            try {
                // Fetch data from Firestore
                const eventsQuery = query(collection(db, "events"), orderBy("date", "asc"));
                const querySnapshot = await getDocs(eventsQuery);
                // FullCalendar can directly use objects with 'title' and 'date' keys
                const events = querySnapshot.docs.map(doc => doc.data());

                // Render the table below the calendar
                renderTable(events);
                // Render the new FullCalendar
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
                const row = `<tr>
                    <td>${event.title}</td>
                    <td>${eventDate.toLocaleDateString('en-SG', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                    <td>${event.time}</td>
                    <td>${event.location}</td>
                    <td>${event.description}</td>
                </tr>`;
                eventTableBody.innerHTML += row;
            });
        };

        const renderFullCalendar = (events) => {
            if (typeof FullCalendar !== 'undefined') {
                const calendar = new FullCalendar.Calendar(calendarEl, {
                    // Use the Bootstrap 5 theme
                    themeSystem: 'bootstrap5',
                    // Define the header buttons
                    headerToolbar: {
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,dayGridWeek'
                    },
                    // The initial view when the calendar loads
                    initialView: 'dayGridMonth',
                    // Directly pass the event data fetched from Firebase
                    events: events 
                });
                calendar.render();
            } else {
                console.error("FullCalendar library is not loaded.");
            }
        };

        // Start the process
        loadAndDisplayEvents();
    }
    // 5. GALLERY FILTERING AND LIGHTBOX
    // -------------------------------------------------------------------------
    const galleryContainer = document.getElementById('animated-thumbnails');
    if (galleryContainer && typeof lightGallery !== 'undefined') {
        lightGallery(galleryContainer, {
            selector: '.gallery-item', thumbnail: true, animateThumb: false, showThumbByDefault: false, download: false
        });
        const filterButtons = document.querySelectorAll('.filter-btn');
        const galleryItems = document.querySelectorAll('.gallery-item');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.replace('btn-primary', 'btn-outline-primary'));
                button.classList.replace('btn-outline-primary', 'btn-primary');
                const filter = button.getAttribute('data-filter');
                galleryItems.forEach(item => {
                    item.style.display = (filter === 'all' || item.getAttribute('data-category') === filter) ? 'block' : 'none';
                });
            });
        });
    }

    // 6. APPLICATION FORM (`join.html`)
    // -------------------------------------------------------------------------
    const applicationForm = document.getElementById('application-form');
    if (applicationForm) {
        // Dynamically populate the audition slots dropdown
        const auditionSlotSelect = document.getElementById('audition_slot');
        if (auditionSlotSelect) {
            // Helper to format date/time for display and value
            function formatSlot(date) {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                const hh = String(date.getHours()).padStart(2, '0');
                const min = String(date.getMinutes()).padStart(2, '0');
                return {
                    value: `${yyyy}-${mm}-${dd}T${hh}:${min}`,
                    label: `${yyyy}-${mm}-${dd} (${date.toLocaleDateString(undefined, { weekday: 'short' })}) ${hh}:${min}`
                };
            }

            // Find next 4 Fridays from today
            const slots = [];
            const now = new Date();
            let friday = new Date(now);
            friday.setHours(17, 0, 0, 0); // Set to 5:00 PM
            // Find the next Friday
            friday.setDate(friday.getDate() + ((5 - friday.getDay() + 7) % 7));
            for (let week = 0; week < 4; week++) {
                for (let t = 17; t <= 19; t++) { // 5 PM to 7 PM
                    for (let min = 0; min < 60; min += 30) {
                        const slot = new Date(friday);
                        slot.setHours(t, min, 0, 0);
                        slots.push(formatSlot(slot));
                    }
                }
                // Add 1 week
                friday.setDate(friday.getDate() + 7);
            }
            // Add 8:00 PM slot for each Friday
            friday = new Date(now);
            friday.setHours(20, 0, 0, 0);
            friday.setDate(friday.getDate() + ((5 - friday.getDay() + 7) % 7));
            for (let week = 0; week < 4; week++) {
                const slot = new Date(friday);
                slots.push(formatSlot(slot));
                friday.setDate(friday.getDate() + 7);
            }
            // Populate dropdown
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
            if (typeof emailjs === 'undefined') { alert('Email service is currently unavailable.'); return; }
            
            const serviceID = 'service_tfyce8f'; 
            const templateID = 'template_drttt8h'; // Template for APPLICATIONS
            const publicKey = 'hR23SDttfQyG0mOCi';

            const submitButton = applicationForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Submitting...`;

            emailjs.sendForm(serviceID, templateID, this, publicKey)
                .then(() => { window.location.href = 'thankyou.html'; }, 
                (err) => {
                    console.error('EmailJS Error:', err);
                    alert('Failed to submit application. Please try again later.');
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonText;
                });
        });
    }

    // 7. CONTACT FORM (`contact.html`)
    // -------------------------------------------------------------------------
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
         contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (typeof emailjs === 'undefined') { alert('Email service is currently unavailable.'); return; }
            
            const serviceID = 'service_tfyce8f'; 
            const templateID = 'template_contact_form'; // A DIFFERENT template for general contact
            const publicKey = 'hR23SDttfQyG0mOCi';

            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Sending...`;

            emailjs.sendForm(serviceID, templateID, this, publicKey)
                .then(() => { window.location.href = 'thankyou.html'; },
                (err) => {
                    console.error('EmailJS Error:', err);
                    alert('Failed to send message. Please try again later.');
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonText;
                });
        });
    }

});