import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { ensureStaffProfile } from '../lib/firestore'
import type { StaffProfile } from '../types/auth'
import { auth } from '../lib/firebase'

interface AuthContextValue {
  user: User | null
  profile: StaffProfile | null
  loading: boolean
  profileError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  const loadProfile = useCallback(async (nextUser: User) => {
    setProfileError(null)
    try {
      const staffProfile = await ensureStaffProfile(nextUser)
      setProfile(staffProfile)
    } catch (err) {
      setProfile(null)
      setProfileError(err instanceof Error ? err.message : 'Access denied')
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      if (nextUser) {
        await loadProfile(nextUser)
      } else {
        setProfile(null)
        setProfileError(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    setProfileError(null)
    await signInWithEmailAndPassword(auth, email, password)
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
    setProfile(null)
    setProfileError(null)
  }, [])

  const value = useMemo(
    () => ({ user, profile, loading, profileError, signIn, signOut }),
    [user, profile, loading, profileError, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
