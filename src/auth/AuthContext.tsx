import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { getFirebaseApp } from '../config/firebase';

export type AuthUser = FirebaseAuthTypes.User | null;

type AuthContextValue = {
  user: AuthUser;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Ensure Firebase is initialized
  getFirebaseApp();

  const [user, setUser] = useState<AuthUser>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(u => {
      setUser(u);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, [initializing]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    initializing,
    async signIn(email, password) {
      await auth().signInWithEmailAndPassword(email.trim(), password);
    },
    async signUp(email, password) {
      await auth().createUserWithEmailAndPassword(email.trim(), password);
    },
    async signOut() {
      await auth().signOut();
    },
  }), [user, initializing]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
