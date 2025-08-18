"use client";
import { AuthProvider } from "@/context/AuthContext.js";
import { useAuth } from "@/context/AuthContext.js";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function Dashboard() {
  const { user, logout, loading } = useAuth() as any;
  const signOut = logout;
  const [stats, setStats] = useState({
    companies: 0,
    contacts: 0,
    deals: 0,
    tasks: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      const [
        { count: companies },
        { count: contacts },
        { count: deals },
        { count: tasks },
      ] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("deals").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        companies: companies ?? 0,
        contacts: contacts ?? 0,
        deals: deals ?? 0,
        tasks: tasks ?? 0,
      });
    };
    fetchStats();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <nav className="w-64 bg-white shadow-lg h-screen p-6 flex flex-col gap-4">
        <h2 className="text-2xl font-bold mb-6">SupaCRM</h2>
        <button
          onClick={signOut}
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
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
