// /website/assets/js/system/firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyDyts8mOZou6K1qPLYR2AQugR0RFwyDS8s",
  authDomain: "artan-c7554.firebaseapp.com",
  projectId: "artan-c7554",
  storageBucket: "artan-c7554.firebasestorage.app",
  messagingSenderId: "125487592764",
  appId: "1:125487592764:web:734f02aec52b6bac4c9a39",
  measurementId: "G-JJWZXLBF8B"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}