// js/firebase-config.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD12yWD-aUZWpklVW9OpdthdnjsHayUbYI", // Replace with your actual API key
  authDomain: "nyp-band.firebaseapp.com",
  projectId: "nyp-band",
  storageBucket: "nyp-band.appspot.com",
  messagingSenderId: "932969967322",
  appId: "1:932969967322:web:9798c6c059a6d70711bfe3",
  measurementId: "G-35MWPE5CKQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services to be used in other scripts
export const auth = getAuth(app);
export const db = getFirestore(app);