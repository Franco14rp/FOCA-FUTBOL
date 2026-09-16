import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCiL19r8kQhxdqkF4tvfNp_vhuhcNTVjT0",
  authDomain: "futbol-foca.firebaseapp.com",
  projectId: "futbol-foca",
  storageBucket: "futbol-foca.firebasestorage.app",
  messagingSenderId: "731232868593",
  appId: "1:731232868593:web:11d4c4880e862f77a73150",
  measurementId: "G-0MT4S9PRGN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
