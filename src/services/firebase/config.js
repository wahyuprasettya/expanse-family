// ============================================================
// Firebase Configuration
// Replace these values with your actual Firebase project config
// ============================================================
import { initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB6fsKIzglcBvTvLEYHhLW2LIBkLKN41PA",
  authDomain: "farhan-9ad76.firebaseapp.com",
  projectId: "farhan-9ad76",
  storageBucket: "farhan-9ad76.appspot.com",
  messagingSenderId: "366154491402",
  appId: "1:366154491402:web:725ab6367ca300ec45e1f3",
  measurementId: "G-E7BGG1M49S",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
