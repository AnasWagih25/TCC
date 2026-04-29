// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB09zmFUm505sSDng-7przLhLSEU1RBciM",
  authDomain: "thecc-1e732.firebaseapp.com",
  projectId: "thecc-1e732",
  storageBucket: "thecc-1e732.firebasestorage.app",
  messagingSenderId: "753303687976",
  appId: "1:753303687976:web:aed924c7c68c5a9246761d",
  measurementId: "G-M2E46GNPRP"
};

// Initialize Firebase (prevent re-initialization in Next.js dev mode)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });
export const storage = getStorage(app);
