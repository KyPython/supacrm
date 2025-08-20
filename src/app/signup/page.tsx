"use client";
import { useAuth } from "@/context/AuthContext.js";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { debug, debugError } from "@/lib/debug";
import Container from "@/components/Container";
import Card from "@/components/Card";
import Button from "@/components/Button";

function SignUpContent() {
  // Check Supabase config
  const supabaseConfigMissing =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const router = useRouter();
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signUp(email, password);
      // Onboarding route not present in this project; redirect to dashboard instead
      try {
        router.push("/dashboard");
      } catch (err) {
        debug(
          "[SignUp] router.push failed, will fallback to window.location.replace",
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
              "[SignUp] performing fallback window.location.replace to /dashboard"
            );
            window.location.replace("/dashboard");
          }
        } catch (e) {
          debugError("[SignUp] fallback window.location.replace failed", e);
        }
      }, 0);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Card>
        <h2 className="h2 center">Create an account</h2>

        {supabaseConfigMissing && (
          <div className="mb-4 alert alert-danger">
            Supabase API key or URL is missing. Please check your .env.local
            file.
          </div>
        )}

        {error && <div className="mb-4 alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              className="block"
              style={{ color: "var(--muted)", marginBottom: ".5rem" }}
              htmlFor="email"
            >
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
            <label
              className="block"
              style={{ color: "var(--muted)", marginBottom: ".5rem" }}
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input w-full"
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            disabled={loading || supabaseConfigMissing}
            variant="primary"
            className="w-full"
          >
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>

        <div className="text-center mt-4">
          <Link href="/login" style={{ color: "var(--brand)" }}>
            Already have an account? Log in
          </Link>
        </div>
      </Card>
    </Container>
  );
}

export default function SignUp() {
  return <SignUpContent />;
}
