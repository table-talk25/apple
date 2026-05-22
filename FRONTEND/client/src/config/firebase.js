// File: src/config/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDUg6z8K-Sj-ZIQACwVW_nP1zNWXT-XgBk",
  authDomain: "tabletalk-social.firebaseapp.com",
  projectId: "tabletalk-social",
  storageBucket: "tabletalk-social.firebasestorage.app",
  messagingSenderId: "925236799140",
  appId: "1:925236799140:web:5391fc492e434d2bdf6831",
  measurementId: "G-T8C8F5LH5D"
};

// Evita re-inizializzazione se l'app esiste già (es. webPushService la inizializza prima)
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
