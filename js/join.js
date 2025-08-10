// /js/join.js
import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    initApplicationForm();
});

// Main function to initialize the application form
function initApplicationForm() {
    const applicationForm = document.getElementById('application-form');
    if (!applicationForm) return;

    // --- STATE MANAGEMENT ---
    let availableFridays = [];
    let selectedDate = null; // Stores the selected date string 'YYYY-MM-DD'
    let selectedTime = null; // Stores the selected time string 'HH:MM'
    
    // --- ELEMENT SELECTORS ---
    const calendarContainer = document.getElementById('calendar-container');
    const timeSlotsContainer = document.getElementById('time-slots-container');
    const selectedDateInput = document.getElementById('selected_date');
    const selectedTimeInput = document.getElementById('selected_time');
    const formattedSlotInput = document.getElementById('audition_slot_formatted');
    const errorContainer = document.getElementById('audition-error');
    const studentIdInput = document.getElementById('student_id');
    const emailInput = document.getElementById('email');

    // --- CALENDAR LOGIC ---

    // Renders the calendar for a given month and year
    function renderCalendar(year, month) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        let html = `
            <div class="calendar-header">
                <h5>${monthNames[month]} ${year}</h5>
            </div>
            <div id="calendar-grid">
        `;
        // Day headers (Sun, Mon, etc.)
        dayNames.forEach(day => html += `<div class="calendar-day-header">${day}</div>`);
        
        // Blank days for grid alignment
        for (let i = 0; i < firstDay.getDay(); i++) {
            html += `<div></div>`;
        }

        // All days of the month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayClass = availableFridays.includes(dateStr) ? 'available' : '';
            const selectedClass = (dateStr === selectedDate) ? 'selected' : '';
            html += `<div class="calendar-day ${dayClass} ${selectedClass}" data-date="${dateStr}">${day}</div>`;
        }
        html += `</div>`;
        calendarContainer.innerHTML = html;
        addCalendarEventListeners();
    }
    
    // Generates the list of the next 4 available Fridays
    function generateAvailableFridays() {
        let fridays = [];
        let today = new Date();
        // Start from today
        let currentDate = new Date(today);
        // Find the next Friday
        currentDate.setDate(currentDate.getDate() + (5 - currentDate.getDay() + 7) % 7);

        while (fridays.length < 4) {
            const yyyy = currentDate.getFullYear();
            const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
            const dd = String(currentDate.getDate()).padStart(2, '0');
            fridays.push(`${yyyy}-${mm}-${dd}`);
            currentDate.setDate(currentDate.getDate() + 7); // Move to the next Friday
        }
        return fridays;
    }

    // Adds click listeners to the calendar days
    function addCalendarEventListeners() {
        document.querySelectorAll('.calendar-day.available').forEach(day => {
            day.addEventListener('click', () => handleDateSelection(day.dataset.date));
        });
    }
    
    // --- TIME SLOT LOGIC ---

    // Renders time slots for the selected date
    async function renderTimeSlots(dateStr) {
        timeSlotsContainer.innerHTML = `<div class="d-flex justify-content-center align-items-center h-100"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;

        const allSlots = ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"];
        
        try {
            // Fetch applications for the selected date to find booked slots
            const q = query(collection(db, "applications"), where("auditionDate", "==", dateStr));
            const querySnapshot = await getDocs(q);
            const bookedTimes = querySnapshot.docs.map(doc => doc.data().auditionTime);

            let html = '<p class="fw-bold text-center mb-3">Pick a Time:</p><div class="time-slot-grid">';
            allSlots.forEach(time => {
                const isBooked = bookedTimes.includes(time);
                const selectedClass = (time === selectedTime) ? 'selected' : '';
                const time12hr = new Date(`1970-01-01T${time}:00`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                html += `<button type="button" class="btn btn-outline-secondary time-slot-btn ${selectedClass}" data-time="${time}" ${isBooked ? 'disabled' : ''}>${time12hr}</button>`;
            });
            html += '</div>';

            timeSlotsContainer.innerHTML = html;
            addTimeSlotEventListeners();
        } catch (error) {
            console.error("Error fetching booked slots:", error);
            timeSlotsContainer.innerHTML = `<p class="text-danger text-center">Could not load time slots. Please try again.</p>`;
        }
    }
    
    // Adds click listeners to the time slot buttons
    function addTimeSlotEventListeners() {
        document.querySelectorAll('.time-slot-btn').forEach(btn => {
            if (!btn.disabled) {
                btn.addEventListener('click', () => handleTimeSelection(btn.dataset.time));
            }
        });
    }
    
    // --- SELECTION HANDLERS ---
    
    // Handles what happens when a user clicks a date
    function handleDateSelection(dateStr) {
        selectedDate = dateStr;
        selectedTime = null; // Reset time when a new date is chosen
        updateHiddenInputs();
        
        // Re-render calendar to show selection
        renderCalendar(new Date(dateStr).getFullYear(), new Date(dateStr).getMonth());
        // Render time slots for the selected date
        renderTimeSlots(dateStr);
    }
    
    // Handles what happens when a user clicks a time
    function handleTimeSelection(timeStr) {
        selectedTime = timeStr;
        updateHiddenInputs();

        // Re-render time slots to show selection
        renderTimeSlots(selectedDate); 
    }
    
    // Updates the hidden input fields used for form submission
    function updateHiddenInputs() {
        selectedDateInput.value = selectedDate || '';
        selectedTimeInput.value = selectedTime || '';
        if (selectedDate && selectedTime) {
            const dateObj = new Date(`${selectedDate}T${selectedTime}`);
            const formatted = dateObj.toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) 
                              + ' at ' + dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            formattedSlotInput.value = formatted;
        } else {
            formattedSlotInput.value = '';
        }
    }

    // --- VALIDATION LOGIC ---
    function showError(message) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
    }

    function hideError() {
        errorContainer.style.display = 'none';
    }

    function validateForm() {
        hideError();
        // Student ID validation: YYNNNNA (YY >= 23)
        const studentId = studentIdInput.value.trim().toUpperCase();
        const idRegex = /^(2[3-9]|[3-9][0-9])\d{4}[A-Z]$/;
        if (!idRegex.test(studentId)) {
            showError("Please enter a valid Student ID (e.g., 231234A). The year must be 23 or later.");
            return false;
        }

        // Email validation: must match student ID and domain
        const email = emailInput.value.trim().toLowerCase();
        const expectedEmail = `${studentId.toLowerCase()}@mymail.nyp.edu.sg`;
        if (email !== expectedEmail) {
            showError(`Your email must be ${expectedEmail} to match your Student ID.`);
            return false;
        }
        
        // Check if all required fields are filled
        if (!applicationForm.checkValidity()) {
            showError("Please fill out all personal and musical background fields.");
            return false;
        }
        
        // Check if an audition slot is fully selected
        if (!selectedDate || !selectedTime) {
            showError("Please select an available audition date and time from the calendar.");
            return false;
        }
        
        return true;
    }

    // --- FORM SUBMISSION ---
    applicationForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const submitButton = applicationForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Submitting...`;

        const formData = {
            fullName: document.getElementById('name').value,
            studentId: studentIdInput.value.trim().toUpperCase(),
            email: emailInput.value.trim().toLowerCase(),
            instrument: document.getElementById('instrument').value,
            experience: document.getElementById('experience').value,
            auditionDate: selectedDate,
            auditionTime: selectedTime,
            submittedAt: Timestamp.now()
        };

        try {
            // 1. Save application to Firebase
            await addDoc(collection(db, "applications"), formData);

            // 2. Send email notification via EmailJS
            if (typeof emailjs !== 'undefined') {
                const serviceID = 'service_tfyce8f';
                const templateID = 'template_drttt8h'; // Ensure your template uses the correct variable names
                const publicKey = 'hR23SDttfQyG0mOCi';

                // We send a different object to EmailJS, using the names from the form (`name` attributes)
                await emailjs.sendForm(serviceID, templateID, this, publicKey);
            } else {
                console.warn("EmailJS script not loaded. Skipping email notification.");
            }
            
            // 3. Redirect on success
            window.location.href = 'thankyou.html';

        } catch (error) {
            console.error('Submission Error:', error);
            showError('Failed to submit application. There might be a network issue. Please try again later.');
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });

    // --- INITIALIZATION ---
    availableFridays = generateAvailableFridays();
    renderCalendar(new Date().getFullYear(), new Date().getMonth());
}