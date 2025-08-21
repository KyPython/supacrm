"use client";

import { useEffect, useState } from "react";
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
      {error && (
        <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">{error}</div>
      )}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-blue-100 p-4 rounded shadow">
            <h2 className="text-xl font-semibold">Companies</h2>
            <p className="text-2xl">{counts.companies}</p>
          </div>
          <div className="bg-green-100 p-4 rounded shadow">
            <h2 className="text-xl font-semibold">Contacts</h2>
            <p className="text-2xl">{counts.contacts}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded shadow">
            <h2 className="text-xl font-semibold">Deals</h2>
            <p className="text-2xl">{counts.deals}</p>
          </div>
          <div className="bg-purple-100 p-4 rounded shadow">
            <h2 className="text-xl font-semibold">Tasks</h2>
            <p className="text-2xl">{counts.tasks}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
