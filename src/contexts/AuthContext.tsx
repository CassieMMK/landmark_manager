import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// Pending action: callback to run after successful login
type PendingAction = () => void;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;

  // Auth modal control
  showAuthModal: boolean;
  openAuthModal: (pendingAction?: PendingAction) => void;
  closeAuthModal: () => void;

  // Guard: if user is logged in, run action immediately; otherwise open login modal with pending action
  requireAuth: (action: PendingAction) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children, onToast }: { children: React.ReactNode; onToast?: (msg: string) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Initialize: get current session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // When user logs in and there's a pending action, execute it
  useEffect(() => {
    if (user && pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [user, pendingAction]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    onToast?.(`Welcome! Please check your email for verification.`);
    return { error: null };
  }, [onToast]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    onToast?.('Signed in successfully!');
    setShowAuthModal(false);
    return { error: null };
  }, [onToast]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    onToast?.('Signed out.');
  }, [onToast]);

  const openAuthModal = useCallback((action?: PendingAction) => {
    if (action) setPendingAction(() => action);
    setShowAuthModal(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
    // Don't clear pending action — it runs on login success
  }, []);

  const requireAuth = useCallback((action: PendingAction) => {
    if (user) {
      action();
    } else {
      openAuthModal(action);
    }
  }, [user, openAuthModal]);

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      signUp, signIn, signOut,
      showAuthModal, openAuthModal, closeAuthModal,
      requireAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
