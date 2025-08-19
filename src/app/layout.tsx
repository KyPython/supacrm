import { AuthProvider } from '@/context/AuthContext.js';

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
