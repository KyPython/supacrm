"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext.js";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

type Theme = "light" | "dark" | "system";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}>({ theme: "system", setTheme: () => {}, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth() ?? {};
  const { user, loading: authLoading } = auth;
  const [theme, setThemeState] = useState<Theme>("system");
  
  // Log theme changes (development only, always tracked in observability)
  useEffect(() => {
    logger.debug('Theme state changed', { theme });
  }, [theme]);

  useEffect(() => {
    // load saved preference from localStorage
    const saved = localStorage.getItem("supa_theme");
    if (saved === "light" || saved === "dark" || saved === "system") {
      setThemeState(saved);
    } else if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      setThemeState("dark");
    } else setThemeState("light");
  }, []);

  useEffect(() => {
    const apply = (t: Theme) => {
      const root = document.documentElement;
      if (t === "dark") {
        root.dataset.theme = "dark";
      } else if (t === "light") {
        // Explicitly set light theme to override system preference
        root.dataset.theme = "light";
      } else {
        // system - use media query to determine
        const isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (isDark) {
          root.dataset.theme = "dark";
        } else {
          root.dataset.theme = "light";
        }
      }
    };
    
    // Apply immediately
    apply(theme);
    
    // Listen for system preference changes when in system mode
    if (theme === "system" && typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => apply("system");
      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
      }
      // Fallback for older browsers
      else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, [theme]);

  useEffect(() => {
    // persist to localStorage immediately (works even without auth)
    localStorage.setItem("supa_theme", theme);
    
    // Only save to Supabase if user is fully authenticated with an ID
    // Guard against race condition: wait for auth to finish loading and user to have an ID
    if (authLoading || !user || !user.id || !supabase) {
      logger.debug('Skipping Supabase theme save', { 
        authLoading,
        hasUser: !!user, 
        hasUserId: !!(user?.id),
        hasSupabase: !!supabase 
      });
      return;
    }

    // User is authenticated, safe to save to Supabase
    (async () => {
      try {
        logger.debug('Saving theme to Supabase', { userId: user.id, theme });
        // Try to upsert theme preference
        // Note: This requires the user_settings table to have a 'theme' column
        // If it doesn't exist, this will fail silently
        const { error } = await supabase
          .from("user_settings")
          .upsert({ id: user.id, theme }, { onConflict: "id" });
        
        if (error) {
          // Only log if it's not a column/table missing error
          if (!error.message.includes("column") && !error.message.includes("relation")) {
            logger.warn('Failed to save theme to Supabase', { error: error.message, userId: user.id });
          }
        } else {
          logger.debug('Theme saved successfully to Supabase', { userId: user.id, theme });
        }
      } catch (e: any) {
        // Ignore silently - server schema may not have theme column or user_settings table
        // This is expected if the table/column doesn't exist yet
        if (e?.message && !e.message.includes("column") && !e.message.includes("relation")) {
          logger.warn('Error saving theme to Supabase', { error: e.message, userId: user.id });
        }
      }
    })();
  }, [theme, user, supabase, authLoading]);

  const setTheme = (t: Theme) => {
    logger.debug('setTheme called', { theme: t });
    setThemeState(t);
  };
  
  const toggle = () => {
    logger.debug('Theme toggle called', { current_theme: theme });
    setThemeState((s) => {
      // If system, detect current effective theme
      if (s === "system") {
        const isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        const newTheme = isDark ? "light" : "dark";
        logger.debug('Theme toggled from system', { new_theme: newTheme });
        return newTheme;
      }
      // Otherwise toggle between light and dark
      const newTheme = s === "dark" ? "light" : "dark";
      logger.debug('Theme toggled', { from: s, to: newTheme });
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
