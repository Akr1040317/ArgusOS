import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app"
import { getAnalytics, Analytics } from "firebase/analytics"
import { getAuth, Auth } from "firebase/auth"
import { getFirestore, Firestore } from "firebase/firestore"

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

function getFirebaseApp(): FirebaseApp {
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

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null
let analyticsInstance: Analytics | null = null

function ensureApp(): FirebaseApp {
  if (!app) {
    app = getFirebaseApp()
  }
  return app
}

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    if (!authInstance) {
      authInstance = getAuth(ensureApp())
    }
    const value = Reflect.get(authInstance as object, prop, receiver)
    return typeof value === "function" ? value.bind(authInstance) : value
  },
})

export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop, receiver) {
    if (!dbInstance) {
      dbInstance = getFirestore(ensureApp())
    }
    const value = Reflect.get(dbInstance as object, prop, receiver)
    return typeof value === "function" ? value.bind(dbInstance) : value
  },
})

export const analytics =
  typeof window !== "undefined" && hasFirebaseConfig
    ? (() => {
        try {
          analyticsInstance = getAnalytics(ensureApp())
          return analyticsInstance
        } catch {
          return null
        }
      })()
    : null

export default new Proxy({} as FirebaseApp, {
  get(_target, prop, receiver) {
    const instance = ensureApp()
    const value = Reflect.get(instance as object, prop, receiver)
    return typeof value === "function" ? value.bind(instance) : value
  },
})
