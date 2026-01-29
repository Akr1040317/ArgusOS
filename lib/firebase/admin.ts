import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App | undefined;

if (!getApps().length) {
  // Try to initialize with service account credentials if available
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
    } catch (error) {
      console.error("Failed to initialize Firebase Admin with service account:", error);
    }
  }
  
  // Fallback: Initialize with default credentials (uses Application Default Credentials)
  // This works if running on GCP or if GOOGLE_APPLICATION_CREDENTIALS is set
  if (!app) {
    try {
      app = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
      });
    } catch (error) {
      console.error("Failed to initialize Firebase Admin:", error);
      // For development, we'll still export but operations may fail
      // User needs to set up Firebase Admin credentials
    }
  }
}

export const adminAuth = app ? getAuth(app) : getAuth();
export const adminDb = app ? getFirestore(app) : getFirestore();
