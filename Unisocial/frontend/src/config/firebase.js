import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "social-hub-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "social-hub-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "social-hub-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

const app = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(app);
const firebaseStorage = getStorage(app);

if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(firebaseAuth, "http://localhost:9099");
  connectStorageEmulator(firebaseStorage, "localhost", 9199);
}

export { app, firebaseAuth, firebaseStorage };
