"use client";
import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { debug, debugWarn, debugError } from '@/lib/debug';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext(null);

// debug helpers imported from src/lib/debug

export function AuthProvider({ children }) {
  debug('[AuthProvider] render');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!loading && !user) {
      const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup') || pathname?.startsWith('/auth');
      debug('[AuthProvider] redirect-check', { loading, user, pathname, isAuthPage });
      if (!isAuthPage) {
        try {
          router.replace('/');
        } catch (err) {
          debugWarn('[AuthProvider] router.replace failed, falling back to window.location.replace', err);
          try { window.location.replace('/'); } catch(e) { /* ignore */ }
        }
      }
    }
  }, [loading, user, pathname, router]);

  useEffect(() => {
    if (!supabase) {
      debugError('[AuthProvider] Supabase not configured');
      setLoading(false);
      setUser(null);
      return;
    }

    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        debug('[AuthProvider] initial session', session);
        if (session) {
          const { data: profile, error: profileError } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
          if (profileError) debugWarn('[AuthProvider] profile fetch error (ignored):', profileError);
          if (profile) setUser({ ...session.user, ...profile }); else setUser(session.user);

          const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup') || pathname?.startsWith('/auth');
          if (isAuthPage && typeof window !== 'undefined') {
            try { window.location.href = '/dashboard'; return; } catch (e) { debugError('[AuthProvider] initial redirect failed', e); }
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        debugError('[AuthProvider] getInitialSession error', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      debug('[AuthProvider] auth state change', event, session);
      try {
        if (session) {
          const { data: profile, error: profileError } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
          if (profileError) debugWarn('[AuthProvider] profile fetch error (ignored):', profileError);
          if (profile) setUser({ ...session.user, ...profile }); else setUser(session.user);

          if (event === 'SIGNED_IN' && typeof window !== 'undefined') {
            try { window.location.href = '/dashboard'; return; } catch (e) { debugError('[AuthProvider] SIGNED_IN redirect failed', e); }
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        debugError('[AuthProvider] onAuthStateChange handler error', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[AuthProvider] login error', err);
      throw err;
    }
  };

  const signUp = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[AuthProvider] signup error', err);
      throw err;
    }
  };

  const sendMagicLink = async (email) => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback` } });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[AuthProvider] magic link error', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      try { router.replace('/'); } catch(e) { if (typeof window !== 'undefined') window.location.href = '/'; }
    }
  };

  const value = { user, loading, login, signUp, sendMagicLink, logout };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
