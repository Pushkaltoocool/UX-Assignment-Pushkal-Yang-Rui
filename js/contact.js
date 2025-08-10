import { db } from './firebase-config.js';
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function () {
    initContactForm();
});

function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;

    contactForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Sending...`;

        // Pushkal: Grab all the form values here.
        const formData = {
            from_name: document.getElementById('name').value,
            from_email: document.getElementById('email').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value,
        };

        try {
            // Rui: Save the message to Firestore first.
            await addDoc(collection(db, 'contacts'), {
                ...formData,
                createdAt: Timestamp.now()
            });

            // Pushkal: If EmailJS is set up, send a confirmation email.
            if (typeof emailjs === 'undefined') {
                alert('Your message has been received, but the email confirmation could not be sent.');
                window.location.href = 'thankyou.html';
                return;
            }

            const serviceID = 'service_tfyce8f';
            const templateID = 'template_contact_form';
            const publicKey = 'hR23SDttfQyG0mOCi';


            await emailjs.sendForm(serviceID, templateID, this, publicKey);

            window.location.href = 'thankyou.html';

        } catch (err) {
            console.error('Operation Failed:', err);
            alert('Failed to send message. Please try again later.');
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
}