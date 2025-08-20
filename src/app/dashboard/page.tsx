"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

function DashboardContent() {
  const [counts, setCounts] = useState({
    companies: 0,
    contacts: 0,
    deals: 0,
    tasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCounts() {
      setLoading(true);
      setError("");
      try {
        const tables = ["companies", "contacts", "deals", "tasks"];
        if (!supabase) {
          setError("Supabase client is not initialized.");
          return;
        }
        const results = await Promise.all(
          tables.map(
            async (table) =>
              await supabase!
                .from(table)
                .select("id", { count: "exact", head: true })
          )
        );
        setCounts({
          companies: results[0].count || 0,
          contacts: results[1].count || 0,
          deals: results[2].count || 0,
          tasks: results[3].count || 0,
        });
      } catch (err) {
        setError("Failed to load dashboard data.");
      }
      setLoading(false);
    }
    fetchCounts();
  }, []);

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <Link
            href="/companies"
            className="p-4 rounded shadow block hover:shadow-md transition-shadow cursor-pointer"
            style={{ background: "var(--brand-10)" }}
          >
            <h2 className="text-xl font-semibold">Companies</h2>
            <p className="text-2xl">{counts.companies}</p>
          </Link>

          <Link
            href="/contacts"
            className="p-4 rounded shadow block hover:shadow-md transition-shadow cursor-pointer"
            style={{ background: "var(--success-10)" }}
          >
            <h2 className="text-xl font-semibold">Contacts</h2>
            <p className="text-2xl">{counts.contacts}</p>
          </Link>

          <Link
            href="/deals"
            className="p-4 rounded shadow block hover:shadow-md transition-shadow cursor-pointer"
            style={{ background: "var(--warning-10)" }}
          >
            <h2 className="text-xl font-semibold">Deals</h2>
            <p className="text-2xl">{counts.deals}</p>
          </Link>

          <Link
            href="/tasks"
            className="p-4 rounded shadow block hover:shadow-md transition-shadow cursor-pointer"
            style={{ background: "var(--purple-10)" }}
          >
            <h2 className="text-xl font-semibold">Tasks</h2>
            <p className="text-2xl">{counts.tasks}</p>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
