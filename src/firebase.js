import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// ─────────────────────────────────────────────────────────────────────────────
// 🔴 STEP 1: Replace every value below with YOUR Firebase project config.
//
//    How to get these values:
//    1. Go to https://console.firebase.google.com
//    2. Open your project → click the gear icon → "Project settings"
//    3. Scroll to "Your apps" → click your web app (or add one)
//    4. Copy the firebaseConfig object and paste the values below
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "PASTE_YOUR_API_KEY_HERE",
  authDomain:        "PASTE_YOUR_AUTH_DOMAIN_HERE",
  databaseURL:       "https://cmpnd-league-default-rtdb.firebaseio.com",
  projectId:         "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket:     "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID_HERE",
  appId:             "PASTE_YOUR_APP_ID_HERE",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
