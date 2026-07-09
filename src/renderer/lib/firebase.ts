import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Mock config for local testing, replace with real values later
const firebaseConfig = {
  apiKey: "mock-key",
  authDomain: "mock.firebaseapp.com",
  projectId: "produchive",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
