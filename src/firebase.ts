import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCA9y-rSzGYDYOFqyu20eBjxwFuRk-OzyQ",
  authDomain: "ai-studio-applet-webapp-13d11.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-13d11",
  storageBucket: "ai-studio-applet-webapp-13d11.firebasestorage.app",
  messagingSenderId: "901073368127",
  appId: "1:901073368127:web:a14f3624c493bffb60b48a"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom database ID
export const db = getFirestore(app, "ai-studio-a5d18d85-91f3-44a5-92b0-b74bbb11e0fd");

// Initialize Authentication
export const auth = getAuth(app);

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("client is offline")) {
      console.warn("Firebase client is offline. Firestore connection will resume when online.");
    }
  }
}

testConnection();

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error("Firestore Error:");
  throw new Error(JSON.stringify(errInfo));
}

