import { useAuth } from "@/context/AuthContext.js";
import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const router = useRouter();
  const { login, sendMagicLink } = useAuth() as {
    login: (email: string, password: string) => Promise<any>;
    sendMagicLink: (email: string) => Promise<any>;
  };

  const handleEmailPasswordLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email, password);
      router.push("/dashboard");
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-center text-2xl font-bold mb-6">
            Check Your Email
          </h2>
          <p className="text-center text-gray-600 mb-4">
            We've sent a magic link to {email}. Click the link to log in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-center text-2xl font-bold mb-6">
          Log in to SupaCRM
        </h2>

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
              className="w-full p-2 border rounded"
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
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="text-center mb-4">
          <span className="text-gray-500">or</span>
        </div>

        <button
          onClick={handleMagicLinkLogin}
          disabled={loading}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded mb-4"
        >
          {loading ? "Sending..." : "Login with Magic Link"}
        </button>

        <div className="text-center mt-4">
          <Link href="/signup" className="text-blue-500 hover:text-blue-700">
            Don't have an account? Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
