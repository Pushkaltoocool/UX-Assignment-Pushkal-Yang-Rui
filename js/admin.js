// js/admin.js

import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Collection references
const eventsCollection = collection(db, 'events');
const announcementsCollection = collection(db, 'announcements');

// --- LOGIN PAGE LOGIC (for admin.html) ---
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
                        <td>${event.title}</td> <td>${event.date}</td> <td>${event.time}</td>
                        <td>${event.location}</td> <td>${event.description}</td>
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
                        data-text="${ann.text}" 
                        data-link="${ann.link || ''}"
                        data-start="${startDate.toISOString().slice(0, 16)}"
                        data-end="${endDate.toISOString().slice(0, 16)}">
                        <td class="text-truncate" style="max-width: 250px;">${ann.text}</td>
                        <td class="text-truncate" style="max-width: 150px;"><a href="${ann.link}" target="_blank">${ann.link}</a></td>
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
}