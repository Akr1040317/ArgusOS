import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAnalytics, type Analytics } from "firebase/analytics"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
)

function createFirebaseApp(): FirebaseApp {
  if (!hasFirebaseConfig) {
    throw new Error(
      "Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* environment variables."
    )
  }

  if (getApps().length) {
    return getApp()
  }

  return initializeApp(firebaseConfig)
}

// Real Firebase instances are required. Firestore rejects Proxy objects in collection()/doc().
const app = hasFirebaseConfig ? createFirebaseApp() : (null as unknown as FirebaseApp)

export const auth: Auth = hasFirebaseConfig
  ? getAuth(app)
  : (null as unknown as Auth)

export const db: Firestore = hasFirebaseConfig
  ? getFirestore(app)
  : (null as unknown as Firestore)

export const analytics: Analytics | null =
  typeof window !== "undefined" && hasFirebaseConfig
    ? getAnalytics(app)
    : null

export default app
