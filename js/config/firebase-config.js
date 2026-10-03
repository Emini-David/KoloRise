// Copy this web app configuration from Firebase Console > Project settings > Your apps.
// These values identify your Firebase project; never put a service account key here.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJ-1mfTkXURAzocrvgq-1UFtz6FZ6Vdxg",
  authDomain: "kolorise-9db44.firebaseapp.com",
  projectId: "kolorise-9db44",
  storageBucket: "kolorise-9db44.firebasestorage.app",
  messagingSenderId: "86670134537",
  appId: "1:86670134537:web:be8061784571d3e61357d8"
};

const unfinished = Object.entries(firebaseConfig).filter(([, value]) => value.startsWith("PASTE_"));
if (unfinished.length) {
  console.warn(`Firebase is not fully configured. Paste these values into js/config/firebase-config.js: ${unfinished.map(([key]) => key).join(", ")}.`);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
