import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBXXYwn5xE8G1mddyjmYgofY8DcpQPM7A8",
  authDomain: "startupinvesthub-5d84a.firebaseapp.com",
  projectId: "startupinvesthub-5d84a",
  storageBucket: "startupinvesthub-5d84a.firebasestorage.app",
  messagingSenderId: "87634349043",
  appId: "1:87634349043:web:699c8ca347a3b1cef22086",
  measurementId: "G-Q5W5FVSGE9"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
