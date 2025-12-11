"use client";
import React from "react";
import { useThemeContext } from "@/context/ThemeContext";
import { FaMoon, FaSun } from "react-icons/fa";
import { logger } from "@/lib/logger";

export default function ThemeToggle({
  className = "",
}: {
  className?: string;
}) {
  const { theme, toggle } = useThemeContext();
  
  // Determine the effective theme (what's actually displayed)
  const getEffectiveTheme = () => {
    if (theme === "dark") return "dark";
    if (theme === "light") return "light";
    // system - check actual preference
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  };
  
  const effectiveTheme = getEffectiveTheme();
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    logger.debug('Theme toggle button clicked', { current_theme: theme });
    try {
      toggle();
      logger.debug('Theme toggle called successfully', { theme });
    } catch (error) {
      logger.error('Error calling theme toggle', error as Error, { theme });
    }
  };
  
  // Log component render (development only, always tracked in observability)
  React.useEffect(() => {
    logger.debug('ThemeToggle component rendered', { theme, effective_theme: effectiveTheme });
  }, [theme, effectiveTheme]);
  
  return (
    <button
      onClick={handleClick}
      type="button"
      aria-label="Toggle theme"
      title={`Current theme: ${theme === "system" ? `system (${effectiveTheme})` : theme}`}
      className={`inline-flex items-center justify-center p-2 rounded ${className}`}
      style={{ 
        background: "transparent", 
        color: "var(--fg)",
        cursor: "pointer",
        border: "none",
        outline: "none",
        zIndex: 1000,
        position: "relative"
      }}
      onMouseDown={(e) => {
        logger.debug('ThemeToggle MouseDown event');
        e.stopPropagation();
      }}
      onMouseUp={(e) => {
        logger.debug('ThemeToggle MouseUp event');
        e.stopPropagation();
      }}
    >
      {effectiveTheme === "dark" ? <FaSun /> : <FaMoon />}
    </button>
  );
}
