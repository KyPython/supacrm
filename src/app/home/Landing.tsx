"use client";
import Link from "next/link";
import Button from "@/components/Button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col">
      <header className="w-full border-b" style={{ background: "var(--bg)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">SupaCRM</div>
            <div className="text-sm text-muted">Secure Multi-Role SaaS</div>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm"
              style={{ color: "var(--muted)" }}
            >
              Log in
            </Link>
            <Button href="/signup" variant="primary" className="px-4 py-2">
              Get started
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <section>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              CRM that respects your data and your team
            </h1>
            <p className="text-lg text-muted mb-6">
              Manage companies, contacts, deals, files and tasks with role-based
              access and secure Supabase-backed storage. Fast setup, delightful
              UI.
            </p>
            <div className="flex items-center gap-4">
              <Button href="/signup" variant="primary" className="px-6 py-3">
                Get started
              </Button>
              <Button href="/login" variant="ghost" className="px-6 py-3">
                Log in
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted">
              No credit card required • Built on Supabase
            </p>
          </section>

          <section>
            <div className="grid grid-cols-1 gap-4">
              <div
                className="p-4 rounded shadow"
                style={{ background: "var(--card)" }}
              >
                <h3 className="font-semibold">Companies</h3>
                <p className="text-sm text-muted">
                  Organize company records and relationships.
                </p>
              </div>
              <div
                className="p-4 rounded shadow"
                style={{ background: "var(--card)" }}
              >
                <h3 className="font-semibold">Contacts</h3>
                <p className="text-sm text-muted">
                  Centralize your contacts and communication history.
                </p>
              </div>
              <div
                className="p-4 rounded shadow"
                style={{ background: "var(--card)" }}
              >
                <h3 className="font-semibold">Deals & Tasks</h3>
                <p className="text-sm text-muted">
                  Track pipelines, assign tasks, and close deals faster.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer
        className="w-full border-t py-6"
        style={{ background: "var(--bg)" }}
      >
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-muted">
          © {new Date().getFullYear()} SupaCRM — Built with Supabase
        </div>
      </footer>
    </div>
  );
}
