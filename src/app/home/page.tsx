import Link from "next/link";
import Container from "@/components/Container";
import Card from "@/components/Card";
import Button from "@/components/Button";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header style={{ background: "var(--card)" }} className="shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="h1">SupaCRM</h1>
            <div>
              <Link
                href="/auth/login"
                style={{ background: "var(--brand)", color: "var(--fg)" }}
                className="py-2 px-4 rounded mr-2"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                style={{ background: "var(--card)", color: "var(--fg)" }}
                className="py-2 px-4 rounded"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1
              style={{ color: "var(--fg)" }}
              className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl"
            >
              <span className="block">Secure Multi-Role SaaS</span>
              <span className="block" style={{ color: "var(--brand)" }}>
                Built with Next.js & Supabase
              </span>
            </h1>
            <p
              style={{ color: "var(--muted)" }}
              className="mt-3 max-w-md mx-auto text-base sm:text-lg md:mt-5 md:text-xl md:max-w-3xl"
            >
              A powerful CRM solution with advanced role-based security, storage
              management, and intuitive dashboard.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 max-w-5xl mx-auto">
              {/* Feature 1 */}
              <Card className="p-6">
                <div
                  className="w-12 h-12 mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "var(--brand-20)", borderRadius: 8 }}
                >
                  <img
                    src="/globe.svg"
                    alt="Role-based security"
                    className="w-6 h-6"
                  />
                  <Link
                    href="/login"
                    style={{ background: "var(--brand)", color: "var(--fg)" }}
                    className="py-2 px-4 rounded mr-2"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    style={{ background: "var(--card)", color: "var(--fg)" }}
                    className="py-2 px-4 rounded"
                  >
                    Sign up
                  </Link>
                  <img src="/file.svg" alt="File storage" className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Secure File Storage</h3>
                <p className="text-muted">
                  Upload, manage, and share files with role-based access
                  controls
                </p>
              </Card>

              {/* Feature 3 */}
              <Card className="p-6">
                <div
                  className="w-12 h-12 mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "var(--brand-20)", borderRadius: 8 }}
                >
                  <img
                    src="/window.svg"
                    alt="Cross-platform"
                    className="w-6 h-6"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">Cross-Platform</h3>
                <p className="text-muted">
                  Works seamlessly across all devices, including Windows
                  authentication fixes
                </p>
              </Card>
            </div>

            <div className="mt-10 max-w-md mx-auto sm:flex sm:justify-center md:mt-16">
              <div className="rounded-md shadow">
                <Button
                  href="/signup"
                  variant="primary"
                  className="w-full flex items-center justify-center px-8 py-3 md:py-4 md:text-lg md:px-10"
                  leftIcon={undefined}
                >
                  Get started
                </Button>
              </div>
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <Button
                  href="/auth/login"
                  variant="secondary"
                  className="w-full flex items-center justify-center px-8 py-3 md:py-4 md:text-lg md:px-10"
                >
                  Log in
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ background: "var(--card)" }} className="mt-16">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-muted">
            SupaCRM  Secure Multi-Role SaaS with React + Supabase
          </p>
        </div>
      </footer>
    </div>
  );
}
