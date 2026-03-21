// Configuración Firebase (completar)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAul9tKfKK0_5NwiYVz4VS_W5XOscaqq-I",
    authDomain: "focus-crm-14ef2.firebaseapp.com",
    projectId: "focus-crm-14ef2",
    storageBucket: "focus-crm-14ef2.firebasestorage.app",
    messagingSenderId: "995256394963",
    appId: "1:995256394963:web:5b7c06dc9c21c75724a026",
    measurementId: "G-SEZN0MJEPY"
  };


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
