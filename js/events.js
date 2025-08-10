import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    initEventsPage();
});

function initEventsPage() {
    const calendarEl = document.getElementById('calendar-container');
    const eventTableBody = document.querySelector('#event-details-table tbody');

    if (!calendarEl || !eventTableBody) return;

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
                <td class='event-title'>${event.title}</td>
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