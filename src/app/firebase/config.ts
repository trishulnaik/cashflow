// Firebase configuration file
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyClLUV-jqFvoA--RQ49H5nJQkOB1UvRKxo",
  authDomain: "cashflow-9c4c4.firebaseapp.com",
  projectId: "cashflow-9c4c4",
  storageBucket: "cashflow-9c4c4.firebasestorage.app",
  messagingSenderId: "139581948914",
  appId: "1:139581948914:web:04b52075cdf2c4eaf5216b",
  measurementId: "G-25CMX4MGZ2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
// Initialize Analytics conditionally (only in browser environment)
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, db, auth, analytics }; 