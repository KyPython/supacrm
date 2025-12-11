import { AuthProvider } from "@/context/AuthContext.js";
import AuthGate from "@/components/AuthGate";
import ForcedRedirect from "@/components/ForcedRedirect";
import AppRouter from "@/app/router";
import { ThemeProvider } from "@/context/ThemeContext";
import { ObservabilityProvider } from "@/components/ObservabilityProvider";
import type { ReactNode } from "react";
import "@/styles/ui.css";
import "@/app/globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ObservabilityProvider environment={process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV}>
          <AuthProvider>
            <ThemeProvider>
              <AuthGate />
              <ForcedRedirect />
              <AppRouter>{children}</AppRouter>
            </ThemeProvider>
          </AuthProvider>
        </ObservabilityProvider>
      </body>
    </html>
  );
}
