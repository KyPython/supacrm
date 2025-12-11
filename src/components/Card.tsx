import React from "react";

export default function Card({
  children,
  className = "",
  variant = "surface",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "surface" | "transparent";
}) {
  const extra = variant === "transparent" ? "bg-transparent shadow-none" : "";
  return <div className={`card ${extra} ${className}`.trim()}>{children}</div>;
}
