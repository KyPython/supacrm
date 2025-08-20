"use client";
import React, { useEffect, useRef } from "react";

type Props = {
  children: React.ReactNode;
  onClose?: () => void;
  innerClassName?: string;
};

export default function ModalWrapper({
  children,
  onClose,
  innerClassName,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const el = ref.current;
    if (!el) return;
    const container = el; // capture non-null reference for closures
    // focus first focusable element inside modal or the container
    const focusable = container.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (focusable ?? container).focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
          container.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((n) => !n.hasAttribute("disabled"));
        if (nodes.length === 0) {
          e.preventDefault();
          return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    }

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      try {
        previouslyFocused.current?.focus();
      } catch (e) {
        /* ignore */
      }
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "rgba(2,6,23,0.4)" }}
      onMouseDown={(e) => {
        // clicking backdrop closes
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div ref={ref} tabIndex={-1} className={innerClassName ?? ""}>
        {children}
      </div>
    </div>
  );
}
