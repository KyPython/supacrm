"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { AuthProvider, useAuth } from "../../context/AuthContext.js";
import { useForm, ErrorBanner, SuccessBanner } from "../../hooks/useForm";

function DealsPageContent() {
  // Deal type
  interface Deal {
    id: number;
    title: string;
    amount: number;
  }

  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [generalError, setGeneralError] = useState<string>("");
  const form = useForm<{ title: string; amount: string }>({
    title: "",
    amount: "",
  });

  useEffect(() => {
    fetchDeals();
  }, []);

  async function fetchDeals() {
    form.setLoading(true);
    setGeneralError("");
    const { data, error } = await supabase.from("deals").select("*");
    if (!error) setDeals((data as Deal[]) || []);
    else setGeneralError(error.message);
    form.setLoading(false);
  }

  async function addDeal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneralError("");
    if (
      !form.validate({
        title: (v) => (!v ? "Title required" : ""),
        amount: (v) =>
          !v
            ? "Amount required"
            : isNaN(Number(v)) || Number(v) <= 0
            ? "Amount must be positive number"
            : "",
      })
    )
      return;

    form.setLoading(true);
    const { error } = await supabase.from("deals").insert([
      {
        title: form.values.title,
        amount: Number(form.values.amount),
      },
    ]);
    if (!error) {
      form.setValues({ title: "", amount: "" });
      form.setSuccess("Deal added!");
      fetchDeals();
    } else {
      setGeneralError(error.message);
    }
    form.setLoading(false);
  }

  async function deleteDeal(id: number) {
    form.setLoading(true);
    setGeneralError("");
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (!error) fetchDeals();
    else setGeneralError(error.message);
    form.setLoading(false);
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Deals</h1>
      <ErrorBanner
        error={form.errors.title || form.errors.amount || generalError}
      />
      <SuccessBanner message={form.success} />
      <form onSubmit={addDeal} className="mb-6 flex gap-2 items-center">
        <input
          name="title"
          value={form.values.title}
          onChange={form.handleChange}
          placeholder="Title"
          className={`border px-3 py-2 rounded w-full ${
            form.errors.title ? "border-red-400" : ""
          }`}
        />
        <input
          name="amount"
          value={form.values.amount}
          onChange={form.handleChange}
          placeholder="Amount"
          className={`border px-3 py-2 rounded w-full ${
            form.errors.amount ? "border-red-400" : ""
          }`}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-5 py-2 rounded shadow"
          disabled={form.loading}
        >
          Add
        </button>
      </form>
      {form.loading && <p>Loading...</p>}
      <ul className="divide-y">
        {deals.map((d) => (
          <li key={d.id} className="flex justify-between items-center py-3">
            <span className="font-medium">
              {d.title} (${d.amount})
            </span>
            <button
              onClick={() => deleteDeal(d.id)}
              className="text-red-500 hover:underline"
              disabled={form.loading}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DealsPage() {
  return (
    <AuthProvider>
      <DealsPageContent />
    </AuthProvider>
  );
}
