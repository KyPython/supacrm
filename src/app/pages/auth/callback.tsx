// pages/auth/callback.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase.ts";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Handle the auth callback from Supabase
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();

      // Check if we have a session
      if (data?.session) {
        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        // Redirect to login with error
        router.push("/login?error=Unable to authenticate");
      }
    };

    // Fix for Windows redirect bug - add a small delay for browser to process URL fragment
    setTimeout(() => {
      handleAuthCallback();
    }, 100);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-xl font-medium">Authenticating...</h2>
        <p className="mt-2 text-gray-500">Please wait while we log you in.</p>
      </div>
    </div>
  );
}
