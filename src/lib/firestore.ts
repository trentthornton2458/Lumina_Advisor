import { getFirestore } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App safely if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
export const db = getFirestore(app);
