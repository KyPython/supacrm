"use client";
import Link from "next/link";
import Button from "@/components/Button";

export default function Landing() {
  return (
    <main className="min-h-screen flex items-center justify-center p-12">
      <div className="max-w-3xl text-center">
        <h1 className="text-4xl font-bold mb-4">
          SupaCRM — CRM that just works
        </h1>
        <p className="mb-6 text-lg text-muted">
          Manage companies, contacts, deals and tasks — securely and quickly.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button href="/signup" variant="primary" className="px-6 py-3">
            Get started
          </Button>
          <Button href="/login" variant="ghost" className="px-6 py-3">
            Log in
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted">
          No credit card required. Built with Supabase.
        </p>
      </div>
    </main>
  );
}
