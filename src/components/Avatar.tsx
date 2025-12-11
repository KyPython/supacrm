import React from "react";

export default function Avatar({
  name,
  size = 40,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 8,
    background: "var(--card)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--fg)",
    fontWeight: 600,
  };

  return (
    <div
      className={className}
      style={style}
      title={name}
      aria-label={`Avatar for ${name}`}
    >
      {initials}
    </div>
  );
}
