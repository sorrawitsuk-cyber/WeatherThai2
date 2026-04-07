import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// กุญแจโกดังของบอส
const firebaseConfig = {
  apiKey: "AIzaSyDQVebX5jO-iE2RB8bBVQMkQ8ETd7oZfoc",
  authDomain: "thai-env-dashboard.firebaseapp.com",
  databaseURL: "https://thai-env-dashboard-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "thai-env-dashboard",
  storageBucket: "thai-env-dashboard.firebasestorage.app",
  messagingSenderId: "124321790987",
  appId: "1:124321790987:web:7d2a66971e146cc13a1b0e"
};

// สตาร์ทเครื่องยนต์ Firebase
const app = initializeApp(firebaseConfig);

// ส่งออกตัวแปร db (Database) เพื่อให้หน้าอื่นๆ ในเว็บเอาไปใช้งานได้
export const db = getDatabase(app);