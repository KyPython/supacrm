"use client";
import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { debug, debugWarn, debugError } from '@/lib/debug';
import { useRouter, usePathname } from 'next/navigation';
import { logger } from '@/lib/logger';

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
    // Try to get or create Supabase client
    let client = supabase;
    if (!client && typeof window !== 'undefined') {
      // Try to get from window.supabase (set by AuthGate or supabase.ts)
      const win = window as unknown as { supabase?: typeof supabase | null };
      client = win.supabase ?? null;
      
      // If still null, try to create dynamically from env vars
      if (!client) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (url && key) {
          try {
            // Dynamic import to avoid SSR issues
            import('@supabase/supabase-js').then(({ createClient }) => {
              const dynamicClient = createClient(url, key);
              win.supabase = dynamicClient;
              debug('[AuthProvider] Created Supabase client dynamically');
              // Retry getting session with the new client
              getInitialSessionWithClient(dynamicClient);
            }).catch((e) => {
              debugError('[AuthProvider] Failed to create Supabase client dynamically', e);
            });
          } catch (e) {
            debugError('[AuthProvider] Failed to import Supabase client', e);
          }
        }
      }
    }
    
    if (!client) {
      debugError('[AuthProvider] Supabase not configured or invalid NEXT_PUBLIC_SUPABASE_URL');
      setLoading(false);
      setUser(null);
      return;
    }
    
    const getInitialSessionWithClient = async (supabaseClient) => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        debug('[AuthProvider] initial session', session);
        if (session) {
          const { data: profile, error: profileError } = await supabaseClient.from('user_profiles').select('*').eq('id', session.user.id).maybeSingle();
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

    const getInitialSession = async () => {
      return getInitialSessionWithClient(client);
    };

    getInitialSession();

    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      debug('[AuthProvider] auth state change', event, session);
      try {
        if (session) {
          const { data: profile, error: profileError } = await client.from('user_profiles').select('*').eq('id', session.user.id).maybeSingle();
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
    // Try to get or create Supabase client
    let client = supabase;
    if (!client && typeof window !== 'undefined') {
      // Try to get from window.supabase (set by AuthGate or supabase.ts)
      const win = window as unknown as { supabase?: typeof supabase | null };
      client = win.supabase ?? null;
      
      // If still null, try to create dynamically from env vars
      if (!client) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        debug('[AuthContext] Attempting dynamic client creation', { 
          hasUrl: !!url, 
          hasKey: !!key,
          urlPreview: url ? url.substring(0, 30) + '...' : 'undefined'
        });
        if (url && key) {
          try {
            const { createClient } = await import('@supabase/supabase-js');
            client = createClient(url, key);
            win.supabase = client;
            debug('[AuthContext] Created Supabase client dynamically for login');
          } catch (e) {
            debugError('[AuthContext] Failed to create Supabase client dynamically', e);
            // Log the actual error details
            if (process.env.NODE_ENV === 'development') {
              console.error('Dynamic client creation error:', e);
              console.error('URL:', url);
              console.error('Key present:', !!key);
            }
          }
        } else {
          debugError('[AuthContext] Cannot create client - missing env vars', { hasUrl: !!url, hasKey: !!key });
          if (process.env.NODE_ENV === 'development') {
            console.error('Missing environment variables:', { url, key: key ? '***' : undefined });
          }
        }
      }
    }
    
    if (!client) {
      const errorMsg = 'Authentication service is temporarily unavailable. Please try again later.';
      if (process.env.NODE_ENV === 'development') {
        logger.error('Supabase client not available. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      }
      throw new Error(errorMsg);
    }
    
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('Login error', err instanceof Error ? err : new Error(String(err)), { email });
      throw err;
    }
  };

  const signUp = async (email, password) => {
    // Try to get or create Supabase client
    let client = supabase;
    if (!client && typeof window !== 'undefined') {
      // Try to get from window.supabase (set by AuthGate or supabase.ts)
      const win = window as unknown as { supabase?: typeof supabase | null };
      client = win.supabase ?? null;
      
      // If still null, try to create dynamically from env vars
      if (!client) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (url && key) {
          try {
            const { createClient } = await import('@supabase/supabase-js');
            client = createClient(url, key);
            win.supabase = client;
            debug('[AuthContext] Created Supabase client dynamically for signup');
          } catch (e) {
            debugError('[AuthContext] Failed to create Supabase client dynamically', e);
          }
        }
      }
    }
    
    if (!client) {
      const errorMsg = 'Authentication service is temporarily unavailable. Please try again later.';
      if (process.env.NODE_ENV === 'development') {
        logger.error('Supabase client not available. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      }
      throw new Error(errorMsg);
    }
    
    try {
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('Signup error', err instanceof Error ? err : new Error(String(err)), { email });
      throw err;
    }
  };

  const sendMagicLink = async (email) => {
    // Try to get or create Supabase client
    let client = supabase;
    if (!client && typeof window !== 'undefined') {
      // Try to get from window.supabase (set by AuthGate or supabase.ts)
      const win = window as unknown as { supabase?: typeof supabase | null };
      client = win.supabase ?? null;
      
      // If still null, try to create dynamically from env vars
      if (!client) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (url && key) {
          try {
            const { createClient } = await import('@supabase/supabase-js');
            client = createClient(url, key);
            win.supabase = client;
            debug('[AuthContext] Created Supabase client dynamically for magic link');
          } catch (e) {
            debugError('[AuthContext] Failed to create Supabase client dynamically', e);
          }
        }
      }
    }
    
    if (!client) {
      const errorMsg = 'Authentication service is temporarily unavailable. Please try again later.';
      if (process.env.NODE_ENV === 'development') {
        logger.error('Supabase client not available. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      }
      throw new Error(errorMsg);
    }
    
    try {
      const { data, error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback` } });
      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('Magic link error', err instanceof Error ? err : new Error(String(err)), { email });
      throw err;
    }
  };

  const logout = async () => {
    try {
      // Try to get client (same pattern as login/signup)
      let client = supabase;
      if (!client && typeof window !== 'undefined') {
        const win = window as unknown as { supabase?: typeof supabase | null };
        client = win.supabase ?? null;
      }
      if (client) {
        await client.auth.signOut();
      }
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
