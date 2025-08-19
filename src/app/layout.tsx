import { AuthProvider } from "@/context/AuthContext.js";
import AuthGate from "@/components/AuthGate";
import ForcedRedirect from "@/components/ForcedRedirect";

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <AuthGate />
          <ForcedRedirect />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
