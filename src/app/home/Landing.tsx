"use client";
import Link from "next/link";
import Button from "@/components/Button";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <header className="w-full border-b" style={{ background: "var(--bg)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">SupaCRM</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Developer-First CRM</div>
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
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
          <section>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              Developer-First CRM for Modern Teams
            </h1>
            <p className="text-xl mb-4" style={{ color: 'var(--muted)' }}>
              The modern alternative to legacy CRMs. Built on Supabase with real-time sync, PostgreSQL power, and 20-40% lower cost than Salesforce or HubSpot.
            </p>
            <div className="mb-6 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: 'var(--success)' }}>✓</span>
                <span>API access in free tier (competitors paywall this)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: 'var(--success)' }}>✓</span>
                <span>TypeScript SDK & direct PostgreSQL access</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: 'var(--success)' }}>✓</span>
                <span>Generous free tier: 3 users, 10K contacts</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: 'var(--success)' }}>✓</span>
                <span>2FA security & command palette (⌘K) in all tiers</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button href="/signup" variant="primary" className="px-6 py-3">
                Start free trial
              </Button>
              <Button href="/pricing" variant="ghost" className="px-6 py-3">
                View pricing
              </Button>
            </div>
            <p className="mt-6 text-sm" style={{ color: 'var(--muted)' }}>
              No credit card required • Free forever plan available • Built on Supabase
            </p>
          </section>

          <section>
            <div className="grid grid-cols-1 gap-4">
              <div
                className="p-6 rounded-lg shadow-lg border"
                style={{ background: "var(--card)", borderColor: "var(--brand-20)" }}
              >
                <h3 className="font-semibold text-lg mb-2">🚀 Why SupaCRM?</h3>
                <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                  <strong>10-100x faster queries</strong> with PostgreSQL vs legacy databases. Real-time collaboration with Supabase subscriptions. Full database access, webhooks, and optional self-hosting.
                </p>
                <p className="text-xs" style={{ color: "var(--brand)" }}>
                  Starting at $19/user/month • 20% annual discount
                </p>
              </div>
              <div
                className="p-6 rounded-lg shadow-lg border"
                style={{ background: "var(--card)", borderColor: "var(--success-20)" }}
              >
                <h3 className="font-semibold text-lg mb-2">💼 Complete CRM Suite</h3>
                <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                  Manage companies, contacts, deals, files, and tasks with role-based access. Track pipelines, automate workflows, and close deals faster.
                </p>
                <p className="text-xs" style={{ color: "var(--success)" }}>
                  Free tier: 3 users, 10K contacts, API access included
                </p>
              </div>
              <div
                className="p-6 rounded-lg shadow-lg border"
                style={{ background: "var(--card)", borderColor: "var(--warning-20)" }}
              >
                <h3 className="font-semibold text-lg mb-2">⚡ Modern Developer Experience</h3>
                <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                  TypeScript SDK, command palette (⌘K), dark mode, keyboard shortcuts. Built for teams who value speed, transparency, and control.
                </p>
                <p className="text-xs" style={{ color: "var(--warning)" }}>
                  No vendor lock-in • Transparent pricing • Open-source ethos
                </p>
              </div>
            </div>
          </section>
          </div>
          
          {/* Competitive Comparison Section */}
          <div className="mt-20 text-center">
            <h2 className="text-2xl font-bold mb-8">20-40% Lower Cost Than Legacy CRMs</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="p-6 rounded-lg" style={{ background: "var(--card)" }}>
                <div className="text-3xl font-bold mb-2" style={{ color: "var(--brand)" }}>$0</div>
                <div className="text-sm font-semibold mb-2">Free Forever</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>3 users • 10K contacts • API access</div>
              </div>
              <div className="p-6 rounded-lg" style={{ background: "var(--card)" }}>
                <div className="text-3xl font-bold mb-2" style={{ color: "var(--brand)" }}>$19</div>
                <div className="text-sm font-semibold mb-2">Starter /user/month</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>vs $35-90 for competitors</div>
              </div>
              <div className="p-6 rounded-lg" style={{ background: "var(--card)" }}>
                <div className="text-3xl font-bold mb-2" style={{ color: "var(--brand)" }}>$49</div>
                <div className="text-sm font-semibold mb-2">Professional /user/month</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>vs $90-150 for Salesforce/HubSpot</div>
              </div>
            </div>
            <div className="mt-8">
              <Button href="/pricing" variant="primary" className="px-6 py-3">
                See full pricing →
              </Button>
            </div>
          </div>
        </div>
      </main>

      <footer
        className="w-full border-t py-6"
        style={{ background: "var(--bg)" }}
      >
          <div className="max-w-6xl mx-auto px-6 text-center text-sm" style={{ color: 'var(--muted)' }}>
          © {new Date().getFullYear()} SupaCRM — Built with Supabase
        </div>
      </footer>
    </div>
  );
}
