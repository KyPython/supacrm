import React from "react";
import { IconType } from "react-icons";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  leftIcon?: React.ReactNode | IconType;
  rightIcon?: React.ReactNode | IconType;
  ariaLabel?: string;
  href?: string;
};

function renderIcon(icon?: React.ReactNode | IconType) {
  if (!icon) return null;
  if (typeof icon === "function") {
    const C = icon as IconType;
    return (
      <span className="btn-icon" aria-hidden>
        <C />
      </span>
    );
  }
  return (
    <span className="btn-icon" aria-hidden>
      {icon}
    </span>
  );
}

export default function Button({
  children,
  variant = "primary",
  className = "",
  leftIcon,
  rightIcon,
  ariaLabel,
  href,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2";

  const style: React.CSSProperties = {};
  if (variant === "primary") {
    style.background = "var(--brand)";
    style.color = "var(--fg)";
  }
  if (variant === "secondary") {
    style.background = "var(--card)";
    style.color = "var(--fg)";
  }

  const disabledClass = (props as any).disabled
    ? "opacity-60 cursor-not-allowed"
    : "hover:shadow-md";

  const iconLeft = renderIcon(leftIcon);
  const iconRight = renderIcon(rightIcon);

  if (href) {
    // anchor-style button
    return (
      <a
        aria-label={ariaLabel}
        className={`${base} ${disabledClass} ${className}`.trim()}
        style={style}
        href={href}
        {...(props as any)}
      >
        {iconLeft}
        <span>{children}</span>
        {iconRight}
      </a>
    );
  }

  return (
    <button
      aria-label={ariaLabel}
      className={`${base} ${disabledClass} ${className}`.trim()}
      style={style}
      {...props}
    >
      {iconLeft}
      <span>{children}</span>
      {iconRight}
    </button>
  );
}
