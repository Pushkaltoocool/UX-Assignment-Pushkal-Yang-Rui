import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Collection references
const eventsCollection = collection(db, 'events');
const announcementsCollection = collection(db, 'announcements');
const galleryCollection = collection(db, 'gallery');
const applicationsCollection = collection(db, 'applications');
const contactsCollection = collection(db, 'contacts'); 

// Simple HTML escaping function to prevent XSS
const escapeHTML = (str) => {
    if (str === null || str === undefined) return '';
    return str.toString().replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
};

//Login Page Logic
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        errorDiv.style.display = 'none';

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = 'admin-panel.html';
        } catch (error) {
            console.error("Login failed:", error.message);
            errorDiv.textContent = 'Login failed. Please check your email and password.';
            errorDiv.style.display = 'block';
        }
    });
}

// --- ADMIN PANEL LOGIC (for admin-panel.html) ---
const adminPanel = document.getElementById('admin-panel');
if (adminPanel) {
    // Auth state listener for security
    onAuthStateChanged(auth, (user) => {
        if (user) {
            initializeAdminPanel();
        } else {
            window.location.href = 'admin.html';
        }
    });

    const initializeAdminPanel = () => {
        setupEventListeners();
        renderEvents();
        renderAnnouncements();
        renderGallery();
        renderApplications();
        renderContacts(); 
    };
    
    const setupEventListeners = () => {
        // Logout
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try { await signOut(auth); } catch (error) { console.error("Logout failed:", error); }
        });

        // Event Listeners
        document.getElementById('add-event-form').addEventListener('submit', handleEventFormSubmit);
        document.querySelector('#events-table tbody').addEventListener('click', handleEventTableClick);
        
        // Announcement Listeners
        document.getElementById('add-announcement-form').addEventListener('submit', handleAnnouncementFormSubmit);
        document.querySelector('#announcements-table tbody').addEventListener('click', handleAnnouncementTableClick);

        // Gallery Listeners
        document.getElementById('add-image-form').addEventListener('submit', handleImageFormSubmit);
        document.querySelector('#gallery-table tbody').addEventListener('click', handleGalleryTableClick);

        // Application Listeners
        document.getElementById('applications-table-body').addEventListener('click', handleApplicationTableClick);
        
        // Contact Listeners
        document.getElementById('contacts-table-body').addEventListener('click', handleContactTableClick);
    };

    // --- EVENT MANAGEMENT ---
    let editingEventId = null;
    const renderEvents = async () => {
        const tableBody = document.querySelector('#events-table tbody');
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
        const q = query(eventsCollection, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        tableBody.innerHTML = '';
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No events found.</td></tr>';
        } else {
            snapshot.forEach(doc => {
                const event = doc.data();
                tableBody.innerHTML += `
                    <tr data-id="${doc.id}">
                        <td>${escapeHTML(event.title)}</td> <td>${escapeHTML(event.date)}</td> <td>${escapeHTML(event.time)}</td>
                        <td>${escapeHTML(event.location)}</td> <td>${escapeHTML(event.description)}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary edit-btn">Edit</button>
                            <button class="btn btn-sm btn-outline-danger delete-btn">Delete</button>
                        </td>
                    </tr>`;
            });
        }
    };
    const handleEventFormSubmit = async (e) => {
        e.preventDefault();
        const eventData = {
            title: document.getElementById('event-title').value, date: document.getElementById('event-date').value,
            time: document.getElementById('event-time').value, location: document.getElementById('event-location').value,
            description: document.getElementById('event-description').value
        };
        try {
            if (editingEventId) {
                await updateDoc(doc(db, 'events', editingEventId), eventData);
            } else {
                await addDoc(eventsCollection, eventData);
            }
            e.target.reset();
            editingEventId = null;
            document.getElementById('form-title').textContent = 'Add New Event';
            document.querySelector('#add-event-form button').textContent = 'Add Event';
            renderEvents();
        } catch (error) { console.error("Error saving event: ", error); }
    };
    const handleEventTableClick = (e) => {
        const targetRow = e.target.closest('tr');
        if (!targetRow) return;
        const docId = targetRow.dataset.id;
        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Delete this event?')) {
                deleteDoc(doc(db, 'events', docId)).then(renderEvents);
            }
        }
        if (e.target.classList.contains('edit-btn')) {
            const cells = targetRow.querySelectorAll('td');
            document.getElementById('event-title').value = cells[0].textContent;
            document.getElementById('event-date').value = cells[1].textContent;
            document.getElementById('event-time').value = cells[2].textContent;
            document.getElementById('event-location').value = cells[3].textContent;
            document.getElementById('event-description').value = cells[4].textContent;
            editingEventId = docId;
            document.getElementById('form-title').textContent = 'Edit Event';
            document.querySelector('#add-event-form button').textContent = 'Update Event';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // --- ANNOUNCEMENT MANAGEMENT ---
    let editingAnnouncementId = null;
    const renderAnnouncements = async () => {
        const tableBody = document.querySelector('#announcements-table tbody');
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
        const q = query(announcementsCollection, orderBy('startTime', 'desc'));
        const snapshot = await getDocs(q);
        tableBody.innerHTML = '';
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No announcements found.</td></tr>';
        } else {
            const now = new Date();
            snapshot.forEach(doc => {
                const ann = doc.data();
                const startDate = ann.startTime.toDate();
                const endDate = ann.endTime.toDate();
                let statusBadge;
                if (now < startDate) statusBadge = `<span class="badge bg-info text-dark">Scheduled</span>`;
                else if (now > endDate) statusBadge = `<span class="badge bg-secondary">Expired</span>`;
                else statusBadge = `<span class="badge bg-success">Active</span>`;

                tableBody.innerHTML += `
                    <tr data-id="${doc.id}" 
                        data-text="${escapeHTML(ann.text)}" 
                        data-link="${escapeHTML(ann.link || '')}"
                        data-start="${startDate.toISOString().slice(0, 16)}"
                        data-end="${endDate.toISOString().slice(0, 16)}">
                        <td class="text-truncate" style="max-width: 250px;">${escapeHTML(ann.text)}</td>
                        <td class="text-truncate" style="max-width: 150px;"><a href="${escapeHTML(ann.link)}" target="_blank">${escapeHTML(ann.link)}</a></td>
                        <td>${startDate.toLocaleString()}</td> <td>${endDate.toLocaleString()}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary edit-btn">Edit</button>
                            <button class="btn btn-sm btn-outline-danger delete-btn">Delete</button>
                        </td>
                    </tr>`;
            });
        }
    };
    const handleAnnouncementFormSubmit = async (e) => {
        e.preventDefault();
        const announcementData = {
            text: document.getElementById('announcement-text').value,
            link: document.getElementById('announcement-link').value,
            startTime: Timestamp.fromDate(new Date(document.getElementById('announcement-start').value)),
            endTime: Timestamp.fromDate(new Date(document.getElementById('announcement-end').value))
        };
        try {
            if (editingAnnouncementId) {
                await updateDoc(doc(db, 'announcements', editingAnnouncementId), announcementData);
            } else {
                await addDoc(announcementsCollection, { ...announcementData, createdAt: Timestamp.now() });
            }
            e.target.reset();
            editingAnnouncementId = null;
            document.getElementById('announcement-form-title').textContent = 'Add New Announcement';
            document.querySelector('#add-announcement-form button').textContent = 'Add Announcement';
            renderAnnouncements();
        } catch (error) { console.error("Error saving announcement: ", error); }
    };
    const handleAnnouncementTableClick = (e) => {
        const targetRow = e.target.closest('tr');
        if (!targetRow) return;
        const docId = targetRow.dataset.id;
        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Delete this announcement?')) {
                deleteDoc(doc(db, 'announcements', docId)).then(renderAnnouncements);
            }
        }
        if (e.target.classList.contains('edit-btn')) {
            document.getElementById('announcement-text').value = targetRow.dataset.text;
            document.getElementById('announcement-link').value = targetRow.dataset.link;
            document.getElementById('announcement-start').value = targetRow.dataset.start;
            document.getElementById('announcement-end').value = targetRow.dataset.end;
            editingAnnouncementId = docId;
            document.getElementById('announcement-form-title').textContent = 'Edit Announcement';
            document.querySelector('#add-announcement-form button').textContent = 'Update Announcement';
            document.getElementById('announcement-form-title').scrollIntoView({ behavior: 'smooth' });
        }
    };

    // --- GALLERY MANAGEMENT ---
    const IMG_API_KEY = '8c3ac5bab399ca801e354b900052510d'; 
    const renderGallery = async () => {
        const tableBody = document.querySelector('#gallery-table tbody');
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center">Loading...</td></tr>';
        const q = query(galleryCollection, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        tableBody.innerHTML = '';
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No gallery images found.</td></tr>';
        } else {
            snapshot.forEach(doc => {
                const item = doc.data();
                tableBody.innerHTML += `
                    <tr data-id="${doc.id}">
                        <td><img src="${escapeHTML(item.url)}" alt="thumbnail" style="width: 100px; height: auto; border-radius: var(--bs-border-radius-sm);"></td>
                        <td>${escapeHTML(item.description)}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-danger delete-btn">Delete</button>
                        </td>
                    </tr>`;
            });
        }
    };

    const handleImageFormSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const description = document.getElementById('image-description').value;
        const fileInput = document.getElementById('image-file');
        const imageFile = fileInput.files[0];
        const errorDiv = document.getElementById('image-upload-error');
        const submitButton = form.querySelector('button[type="submit"]');

        if (!imageFile || !description) {
            errorDiv.textContent = 'Please provide both a description and an image file.';
            errorDiv.style.display = 'block';
            return;
        }
        
        errorDiv.style.display = 'none';
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Uploading...`;
        
        const formData = new FormData();
        formData.append('image', imageFile);

        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMG_API_KEY}`, {
                method: 'POST', body: formData,
            });
            if (!response.ok) throw new Error('Image upload failed.');
            const result = await response.json();
            if (!result.success) throw new Error(result.error?.message || 'Failed to get URL from image host.');
            
            await addDoc(galleryCollection, {
                url: result.data.url, description: description, createdAt: Timestamp.now()
            });
            form.reset();
            renderGallery();

        } catch (error) {
            console.error("Error adding gallery image:", error);
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    };

    const handleGalleryTableClick = (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const targetRow = e.target.closest('tr');
            if (!targetRow) return;
            const docId = targetRow.dataset.id;
            if (confirm('Delete this image from the gallery?')) {
                deleteDoc(doc(db, 'gallery', docId)).then(renderGallery);
            }
        }
    };

    // --- APPLICATION MANAGEMENT ---
    const renderApplications = async () => {
        const tableBody = document.getElementById('applications-table-body');
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading Applications...</td></tr>';
        
        const q = query(applicationsCollection, orderBy('auditionDate', 'asc'), orderBy('auditionTime', 'asc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No applications found.</td></tr>';
            return;
        }
        
        tableBody.innerHTML = '';
        snapshot.forEach(doc => {
            const app = doc.data();
            const auditionDate = new Date(`${app.auditionDate}T${app.auditionTime}`);
            const formattedSlot = auditionDate.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
                                  + ', ' + auditionDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

            tableBody.innerHTML += `
                <tr data-id="${doc.id}">
                    <td>${escapeHTML(app.fullName)}</td>
                    <td>${escapeHTML(app.studentId)}</td>
                    <td>${escapeHTML(app.email)}</td>
                    <td>${escapeHTML(app.instrument)}</td>
                    <td>${escapeHTML(app.experience)} years</td>
                    <td>${escapeHTML(formattedSlot)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger delete-btn">Delete</button>
                    </td>
                </tr>`;
        });
    };

    const handleApplicationTableClick = (e) => {
        const targetRow = e.target.closest('tr');
        if (!targetRow || !e.target.classList.contains('delete-btn')) return;
        
        const docId = targetRow.dataset.id;
        const applicantName = targetRow.cells[0].textContent;
        
        if (confirm(`Are you sure you want to delete the application for "${applicantName}"? This action cannot be undone.`)) {
            deleteDoc(doc(db, 'applications', docId))
                .then(() => {
                    console.log(`Application ${docId} deleted.`);
                    renderApplications();
                })
                .catch(error => {
                    console.error("Error deleting application:", error);
                    alert("Failed to delete the application. Please try again.");
                });
        }
    };

    // --- CONTACT MESSAGE MANAGEMENT ---
    const renderContacts = async () => {
        const tableBody = document.getElementById('contacts-table-body');
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading Messages...</td></tr>';
        
        const q = query(contactsCollection, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No contact messages found.</td></tr>';
            return;
        }
        
        tableBody.innerHTML = '';
        snapshot.forEach(doc => {
            const msg = doc.data();
            const receivedDate = msg.createdAt.toDate();
            const formattedDate = receivedDate.toLocaleString('en-SG', {
                day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
            });

            tableBody.innerHTML += `
                <tr data-id="${doc.id}">
                    <td>${escapeHTML(formattedDate)}</td>
                    <td>${escapeHTML(msg.from_name)}</td>
                    <td><a href="mailto:${escapeHTML(msg.from_email)}">${escapeHTML(msg.from_email)}</a></td>
                    <td>${escapeHTML(msg.subject)}</td>
                    <td style="white-space: pre-wrap; min-width: 250px; word-break: break-word;">${escapeHTML(msg.message)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger delete-btn">Delete</button>
                    </td>
                </tr>`;
        });
    };

    const handleContactTableClick = (e) => {
        const targetRow = e.target.closest('tr');
        if (!targetRow || !e.target.classList.contains('delete-btn')) return;
        
        const docId = targetRow.dataset.id;
        const contactName = targetRow.cells[1].textContent;
        
        if (confirm(`Are you sure you want to delete the message from "${contactName}"? This action cannot be undone.`)) {
            deleteDoc(doc(db, 'contacts', docId))
                .then(() => {
                    console.log(`Contact message ${docId} deleted.`);
                    renderContacts();
                })
                .catch(error => {
                    console.error("Error deleting contact message:", error);
                    alert("Failed to delete the message. Please try again.");
                });
        }
    };
}