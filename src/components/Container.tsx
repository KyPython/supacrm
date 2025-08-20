import React from "react";

export default function Container({
  children,
  className = "",
  constrained = false,
}: {
  children: React.ReactNode;
  className?: string;
  constrained?: boolean;
}) {
  return (
    <div
      className={`app-container ${
        constrained ? "max-w-3xl" : ""
      } ${className}`.trim()}
    >
      {children}
    </div>
  );
}
