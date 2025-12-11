import React from "react";

export default function Alert({
  variant = "info",
  children,
  className = "",
}: {
  variant?: "info" | "danger" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  const cls = `alert alert-${variant} ${className}`.trim();
  return <div className={cls}>{children}</div>;
}
