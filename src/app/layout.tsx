import { AuthProvider } from "@/context/AuthContext.js";
import AuthGate from "@/components/AuthGate";
import ForcedRedirect from "@/components/ForcedRedirect";
import AppRouter from "@/app/router";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <AuthGate />
          <ForcedRedirect />
          <AppRouter />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
