"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext.js";
import { supabase } from "@/lib/supabase";

type Theme = "light" | "dark" | "system";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}>({ theme: "system", setTheme: () => {}, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth() ?? {};
  const [theme, setThemeState] = useState<Theme>("system");

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
        delete root.dataset.theme;
      } else {
        // system
        delete root.dataset.theme;
      }
    };
    apply(theme);
  }, [theme]);

  useEffect(() => {
    // persist to localStorage and Supabase when user exists
    localStorage.setItem("supa_theme", theme);
    if (user && supabase) {
      (async () => {
        try {
          await supabase
            .from("user_settings")
            .upsert({ id: user.id, theme }, { onConflict: "id" });
        } catch (e) {
          // ignore silently - server schema may not have theme column
        }
      })();
    }
  }, [theme, user]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState((s) => (s === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
