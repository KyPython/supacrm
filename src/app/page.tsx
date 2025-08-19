"use client";
import { useAuth } from "@/context/AuthContext.js";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function Dashboard() {
  const { user, logout, loading } = useAuth() ?? {};
  const [stats, setStats] = useState({
    companies: 0,
    contacts: 0,
    deals: 0,
    tasks: 0,
  });
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [companies, contacts, deals, tasks] = await Promise.all([
        supabase
          ?.from("companies")
          .select("id", { count: "exact", head: true }),
        supabase?.from("contacts").select("id", { count: "exact", head: true }),
        supabase?.from("deals").select("id", { count: "exact", head: true }),
        supabase?.from("tasks").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        companies: companies?.count ?? 0,
        contacts: contacts?.count ?? 0,
        deals: deals?.count ?? 0,
        tasks: tasks?.count ?? 0,
      });
    })();
  }, [user]);

  // Removed unused loadingTimeout
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setLoadingTimeout(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  useEffect(() => {
    console.log("[Page] Checking redirect conditions", { loading, user });
    if (!loading && !user) {
      console.log("[Page] Redirecting to /login");
      window.location.replace("/login");
    }
  }, [loading, user]);

  // Fallback to ensure redirect happens
  if (typeof window !== "undefined" && !loading && !user) {
    console.log("[Page] Immediate redirect to /login");
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid mb-4"></div>
          <span className="text-gray-500">Checking authentication...</span>
        </div>
      </div>
    );
  }

  if (!loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-600">
            Not authenticated
          </h2>
          <p className="text-gray-700">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <nav className="w-64 bg-white shadow-lg h-screen p-6 flex flex-col gap-4">
        <h2 className="text-2xl font-bold mb-6">SupaCRM</h2>
        <button
          onClick={logout}
          className="mt-auto bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
        >
          Log out
        </button>
      </nav>
      <main className="flex-1 p-10">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome, {user?.first_name || user?.email || "User"}!
          </h1>
          <p className="mb-4">
            Role:{" "}
            <span className="font-semibold">
              {user?.role || "Not assigned"}
            </span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
            <div className="bg-blue-50 p-4 rounded shadow text-center">
              <h3 className="font-semibold text-lg">Companies</h3>
              <p className="text-2xl font-bold text-blue-700">
                {stats.companies}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded shadow text-center">
              <h3 className="font-semibold text-lg">Contacts</h3>
              <p className="text-2xl font-bold text-green-700">
                {stats.contacts}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded shadow text-center">
              <h3 className="font-semibold text-lg">Deals</h3>
              <p className="text-2xl font-bold text-yellow-700">
                {stats.deals}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded shadow text-center">
              <h3 className="font-semibold text-lg">Tasks</h3>
              <p className="text-2xl font-bold text-purple-700">
                {stats.tasks}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Page() {
  return <Dashboard />;
}
