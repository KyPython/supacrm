"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext.js";
import { debug, debugError } from "@/lib/debug";
import Container from "@/components/Container";
import Card from "@/components/Card";
import Button from "@/components/Button";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const router = useRouter();
  const { login, sendMagicLink } = useAuth() as {
    login: (email: string, password: string) => Promise<unknown>;
    sendMagicLink: (email: string) => Promise<unknown>;
  };
  // Check Supabase config
  const supabaseConfigMissing =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const handleEmailPasswordLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email, password);
      // Prefer client navigation to dashboard. In some dev/server streaming
      // scenarios Next's RSC router navigation can be blocked; schedule a
      // short hard-redirect fallback to ensure the user lands on the app.
      try {
        router.push("/dashboard");
      } catch (err) {
        debug(
          "[LoginPage] router.push failed, will fallback to window.location.replace",
          err
        );
      }
      setTimeout(() => {
        try {
          if (
            typeof window !== "undefined" &&
            window.location.pathname !== "/dashboard"
          ) {
            debug(
              "[LoginPage] performing fallback window.location.replace to /dashboard"
            );
            window.location.replace("/dashboard");
          }
        } catch (e) {
          debugError("[LoginPage] fallback window.location.replace failed", e);
        }
      }, 0);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkLogin = async () => {
    setLoading(true);
    setError("");

    try {
      await sendMagicLink(email);
      setMagicLinkSent(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <Container>
        <Card>
          <h2 className="h2 center">Check Your Email</h2>
          <p className="muted center">
            We&apos;ve sent a magic link to {email}. Click the link to log in.
          </p>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <h2 className="h2 center">Log in to SupaCRM</h2>

        {supabaseConfigMissing && (
          <div className="mb-4 alert alert-danger">
            Supabase API key or URL is missing. Please check your .env.local
            file.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailPasswordLogin} className="mb-6">
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input w-full"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input w-full"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading || supabaseConfigMissing}
            variant="primary"
            className="w-full"
          >
            {loading ? "Logging in..." : "Log in"}
          </Button>
        </form>

        <div className="text-center mb-4">
          <span className="text-gray-500">or</span>
        </div>

        <Button
          onClick={handleMagicLinkLogin}
          disabled={loading || supabaseConfigMissing}
          variant="secondary"
          className="w-full mb-4"
        >
          {loading ? "Sending..." : "Login with Magic Link"}
        </Button>

        <div className="text-center mt-4">
          <Link href="/signup" className="text-brand hover:text-brand-dark">
            Don&apos;t have an account? Sign up
          </Link>
        </div>
      </Card>
    </Container>
  );
}

export default function LoginPage() {
  return <LoginForm />;
}
