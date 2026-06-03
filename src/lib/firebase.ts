import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

// TODO: remove defaults once Vercel env vars are configured
const defaultFirebaseConfig = {
  apiKey: 'AIzaSyCyP0_nG0oiU75yzX7pkY1F6siBe8K6UrE',
  authDomain: 'guesthouse-5a1ff.firebaseapp.com',
  projectId: 'guesthouse-5a1ff',
  storageBucket: 'guesthouse-5a1ff.firebasestorage.app',
  messagingSenderId: '647984315754',
  appId: '1:647984315754:web:5fe9f77f817c7a022b3913',
  measurementId: 'G-M0D9ZKQT2F',
}

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    defaultFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || defaultFirebaseConfig.measurementId,
}

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
