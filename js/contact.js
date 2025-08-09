// /js/contact.js
document.addEventListener('DOMContentLoaded', function() {
    initContactForm();
});

function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;

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