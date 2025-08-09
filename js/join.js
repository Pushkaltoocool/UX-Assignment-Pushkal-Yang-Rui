// /js/join.js
document.addEventListener('DOMContentLoaded', function() {
    initApplicationForm();
});

function initApplicationForm() {
    const applicationForm = document.getElementById('application-form');
    if(!applicationForm) return;

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
        friday.setDate(friday.getDate() + (5 - friday.getDay() + 7) % 7);

        for (let week = 0; week < 4; week++) {
            for (let t = 17; t <= 19; t++) { 
                for (let min = 0; min < 60; min += 30) {
                    const slot = new Date(friday);
                    slot.setHours(t, min, 0, 0);
                    slots.push(formatSlot(slot));
                }
            }
            friday.setDate(friday.getDate() + 7);
        }
        
        slots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot.value;
            option.textContent = slot.label;
            auditionSlotSelect.appendChild(option);
        });
    }
    
    applicationForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (typeof emailjs === 'undefined') {
            alert('Email service is currently unavailable.');
            return;
        }
        
        const serviceID = 'service_tfyce8f'; 
        const templateID = 'template_drttt8h';
        const publicKey = 'hR23SDttfQyG0mOCi';

        const submitButton = applicationForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Submitting...`;

        emailjs.sendForm(serviceID, templateID, this, publicKey)
            .then(() => {
                window.location.href = 'thankyou.html';
            }, 
            (err) => {
                console.error('EmailJS Error:', err);
                alert('Failed to submit application. Please try again later.');
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            });
    });
}