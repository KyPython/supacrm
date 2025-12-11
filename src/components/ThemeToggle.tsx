"use client";
import React from "react";
import { useThemeContext } from "@/context/ThemeContext";
import { FaMoon, FaSun } from "react-icons/fa";

export default function ThemeToggle({
  className = "",
}: {
  className?: string;
}) {
  const { theme, toggle } = useThemeContext();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      title={`Current theme: ${theme}`}
      className={`inline-flex items-center justify-center p-2 rounded ${className}`}
      style={{ background: "transparent", color: "var(--fg)" }}
    >
      {theme === "dark" ? <FaSun /> : <FaMoon />}
    </button>
  );
}
