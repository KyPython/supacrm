"use client";
import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  console.log("[AuthProvider] Rendering AuthProvider");
  // Log user and loading with full details
  useEffect(() => {
    console.log("[AuthProvider] user:", user);
    console.log("[AuthProvider] loading:", loading);
  }, [user, loading]);
  console.log("[AuthProvider] children:", children);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Fallback: force loading=false after 3 seconds
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading]);
  const router = useRouter();
  const pathname = usePathname();

  // Redirect unauthenticated users to /login (avoid loops on auth pages)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (!loading && !user) {
        const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup') || pathname?.startsWith('/auth');
        console.log('[AuthProvider] redirect check', { loading, user, pathname, isAuthPage });
        if (!isAuthPage) {
          console.log('[AuthProvider] redirecting to /login via router.replace');
          try {
            router.replace('/login');
          } catch (err) {
            console.warn('[AuthProvider] router.replace failed, falling back to window.location.replace', err);
            window.location.replace('/login');
          }
          // Ensure redirect regardless
          try {
            window.location.replace('/login');
          } catch (err) {
            console.error('[AuthProvider] window.location.replace failed', err);
          }
        }
      }
    } catch (err) {
      console.error('[AuthProvider] Redirect error:', err);
    }
  }, [loading, user, pathname, router]);

  useEffect(() => {
    console.log("[AuthProvider] Initializing session check");
    if (!supabase) {
      console.error("[AuthProvider] Supabase is not configured");
      setLoading(false);
      setUser(null);
      return;
    }

    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("[AuthProvider] Initial session:", session);
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          console.log("[AuthProvider] User profile:", profile);
          setUser({
            ...session.user,
            ...profile
          });
        } else {
          console.log("[AuthProvider] No session found");
          setUser(null);
        }
      } catch (err) {
        console.error("[AuthProvider] Error during session check:", err);
        setUser(null);
      }
      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AuthProvider] Auth state changed:", event, session);
        try {
          if (session) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            console.log("[AuthProvider] Updated user profile:", profile);
            setUser({
              ...session.user,
              ...profile
            });
          } else {
            console.log("[AuthProvider] User signed out");
            setUser(null);
          }
        } catch (err) {
          console.error("[AuthProvider] Error during auth state change:", err);
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
  };
  
  const signUp = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Signup error:', error.message);
      throw error;
    }
  };

  const sendMagicLink = async (email) => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Magic link error:', error.message);
      throw error;
    }
  };
  
  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const value = {
    user,
    loading,
    login,
    signUp,
    sendMagicLink,
    logout,
  };

  if (!supabase) {
    // Instead of blocking the entire app UI when Supabase is missing,
    // allow the app to mount so client-side gates (AuthGate) can run and
    // force redirects. We still warn loudly so developers can see the issue.
    console.warn(
      '[AuthProvider] Supabase not configured. NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing. Allowing app to continue so AuthGate can redirect.'
    );
    // Ensure we have sensible defaults for the context so consumers don't crash.
    // Note: session checks will skip when client is absent.
    setTimeout(() => {
      try {
        // Ensure loading is false after the initial check
        // (this is a no-op if state already finalized)
      } catch (e) {
        /* ignore */
      }
    }, 0);
  }
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx) {
    // Log the full context object and its user/loading properties
    console.log('[useAuth] value:', ctx);
    console.log('[useAuth] user:', ctx.user);
    console.log('[useAuth] loading:', ctx.loading);
  }
  return ctx;
}
