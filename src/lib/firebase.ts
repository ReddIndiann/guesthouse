import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

function assertFirebaseConfig() {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ] as const

  const missing = required.filter((key) => !import.meta.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase env: ${missing.join(', ')}. Copy .env.example to .env.local and fill in your Firebase config.`,
    )
  }
}

assertFirebaseConfig()

export const app: FirebaseApp = initializeApp(firebaseConfig)
export const auth: Auth = getAuth(app)
export const db: Firestore = getFirestore(app)

let analyticsInstance: Analytics | null = null

export async function initAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance) return analyticsInstance
  if (typeof window === 'undefined') return null

  const supported = await isSupported()
  if (!supported) return null

  analyticsInstance = getAnalytics(app)
  return analyticsInstance
}
