"use client";

import { useAuth } from '@/context/AuthContext.js';
// components/ProtectedRoute.js
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      router.push('/login');
    }
    
    // If user doesn't have allowed role, redirect to unauthorized
    if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      router.push('/unauthorized');
    }
  }, [user, loading, router, allowedRoles]);

  // Show loading screen while checking auth
  if (loading || !user) {
    return <div>Loading...</div>;
  }

  // If role check is needed and user doesn't have permission
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  return children;
}