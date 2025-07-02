// js/admin.js

// Import necessary services from your Firebase configuration and the Firebase SDK
import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// A reference to the 'events' collection in your Firestore database
const eventsCollection = collection(db, 'events');

// --- LOGIN PAGE LOGIC (for admin.html) ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        errorDiv.style.display = 'none'; // Hide previous errors

        try {
            // Use Firebase Auth to sign in the user
            await signInWithEmailAndPassword(auth, email, password);
            // On success, redirect to the admin panel
            window.location.href = 'admin-panel.html';
        } catch (error) {
            // If login fails, show an error message
            console.error("Login failed:", error.message);
            errorDiv.textContent = 'Login failed. Please check your email and password.';
            errorDiv.style.display = 'block';
        }
    });
}

// --- ADMIN PANEL LOGIC (for admin-panel.html) ---
const adminPanel = document.getElementById('admin-panel');
if (adminPanel) {
    const addEventForm = document.getElementById('add-event-form');
    const eventsTableBody = document.querySelector('#events-table tbody');
    let editingEventId = null; // This will store the ID of the event being edited

    // Auth state listener: This is a security check. It runs whenever the page loads
    // or the user's login state changes.
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // If the user is logged in, display their email and load the events
            const welcomeMessage = document.getElementById('welcome-message');
            if(welcomeMessage) welcomeMessage.textContent = `Welcome, ${user.email}`;
            await renderEvents();
        } else {
            // If no user is logged in, redirect them to the login page
            window.location.href = 'admin.html';
        }
    });

    /**
     * Fetches events from Firestore and displays them in the table.
     */
    const renderEvents = async () => {
        eventsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading events...</td></tr>';
        
        // Create a query to get events, ordered by date in descending order (newest first)
        const q = query(eventsCollection, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        
        eventsTableBody.innerHTML = ''; // Clear loading message

        if (querySnapshot.empty) {
            eventsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No events found. Add one using the form above.</td></tr>';
            return;
        }

        // Loop through each document and create a table row for it
        querySnapshot.forEach((doc) => {
            const event = doc.data();
            const row = `
                <tr data-id="${doc.id}">
                    <td>${event.title}</td>
                    <td>${event.date}</td>
                    <td>${event.time}</td>
                    <td>${event.location}</td>
                    <td>${event.description}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary edit-btn">Edit</button>
                        <button class="btn btn-sm btn-outline-danger delete-btn">Delete</button>
                    </td>
                </tr>
            `;
            eventsTableBody.innerHTML += row;
        });
    };

    /**
     * Handles the submission of the Add/Edit form.
     */
    addEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = addEventForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        // Collect data from the form
        const eventData = {
            title: document.getElementById('event-title').value,
            date: document.getElementById('event-date').value,
            time: document.getElementById('event-time').value,
            location: document.getElementById('event-location').value,
            description: document.getElementById('event-description').value
        };

        try {
            if (editingEventId) {
                // If we are editing, update the existing document
                const eventDoc = doc(db, 'events', editingEventId);
                await updateDoc(eventDoc, eventData);
            } else {
                // If we are adding a new event, create a new document
                await addDoc(eventsCollection, eventData);
            }
            // Reset the form and state
            addEventForm.reset();
            editingEventId = null;
            document.getElementById('form-title').textContent = 'Add New Event';
            submitButton.textContent = 'Add Event';
            await renderEvents(); // Refresh the table
        } catch (error) {
            console.error("Error saving event: ", error);
            alert("Failed to save event. See the console for more details.");
        } finally {
            submitButton.disabled = false;
        }
    });

    /**
     * Handles clicks on the 'Edit' and 'Delete' buttons in the events table.
     */
    eventsTableBody.addEventListener('click', async (e) => {
        const targetRow = e.target.closest('tr');
        if (!targetRow) return;

        const docId = targetRow.dataset.id;
        
        // Handle Delete button click
        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this event?')) {
                try {
                    await deleteDoc(doc(db, 'events', docId));
                    await renderEvents(); // Refresh the table
                } catch (error) {
                    console.error("Error deleting document:", error);
                    alert("Failed to delete event.");
                }
            }
        }

        // Handle Edit button click
        if (e.target.classList.contains('edit-btn')) {
            const cells = targetRow.querySelectorAll('td');
            // Populate the form with the data from the selected table row
            document.getElementById('event-title').value = cells[0].textContent;
            document.getElementById('event-date').value = cells[1].textContent;
            document.getElementById('event-time').value = cells[2].textContent;
            document.getElementById('event-location').value = cells[3].textContent;
            document.getElementById('event-description').value = cells[4].textContent;
            
            // Set the state to "editing"
            editingEventId = docId;
            document.getElementById('form-title').textContent = 'Edit Event';
            addEventForm.querySelector('button[type="submit"]').textContent = 'Update Event';
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to the top to see the form
        }
    });

    /**
     * Handles the logout process.
     */
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            await signOut(auth);
            // The onAuthStateChanged listener will automatically redirect to the login page.
        } catch (error) {
            console.error("Logout failed:", error);
            alert("Logout failed. Please try again.");
        }
    });
}