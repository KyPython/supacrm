"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext.js";
import { useEffect, ReactNode } from "react";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: string[];
};

export default function ProtectedRoute({
  children,
  allowedRoles = [],
}: ProtectedRouteProps) {
  const { user, loading } = useAuth() as {
    user: { role: string } | null;
    loading: boolean;
  };
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (
      user &&
      allowedRoles.length > 0 &&
      !allowedRoles.includes(String(user.role))
    ) {
      router.push("/unauthorized");
    }
  }, [user, loading, router, allowedRoles]);

  if (loading || !user) {
    return <div>Loading...</div>;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(String(user.role))) {
    return null;
  }

  return <>{children}</>;
}
