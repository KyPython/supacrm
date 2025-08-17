import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";
import AppRouter from "./router";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SupaCRM - Secure Multi-Role SaaS",
  description: "A secure CRM built with Next.js, Supabase, and RLS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <AppRouter />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
