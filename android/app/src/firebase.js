// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBpfVaM78BhB1ZsHxTLSrvy991PeNIcrww",
  authDomain: "ai-rapid-response.firebaseapp.com",
  projectId: "ai-rapid-response",
  storageBucket: "ai-rapid-response.firebasestorage.app",
  messagingSenderId: "32766606102",
  appId: "1:32766606102:web:cbeeba7622e1842fb86e37",
  measurementId: "G-9EYS6823Z5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);