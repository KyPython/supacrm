import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useForm, ErrorBanner, SuccessBanner } from "../../hooks/useForm";

export default function DealsPage() {
  // Auth context for current user
  const { user } = useAuth();
  // State for deals list
  const [deals, setDeals] = useState([]);
  // useForm hook for form state, validation, and error handling
  const form = useForm({ title: "", amount: "" });

  useEffect(() => {
    fetchDeals(); // Initial fetch
  }, []);

  async function fetchDeals() {
    form.setLoading(true);
    const { data, error } = await supabase.from("deals").select("*");
    if (!error) setDeals(data || []);
    else form.setErrors({ fetch: error.message });
    form.setLoading(false);
  }

  async function addDeal(e) {
    e.preventDefault();
    // Validate form: title required, amount required and positive
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
    const { error } = await supabase.from("deals").insert({
      title: form.values.title,
      amount: parseFloat(form.values.amount),
    });
    if (!error) {
      form.setValues({ title: "", amount: "" });
      form.setSuccess("Deal added!");
      fetchDeals();
    } else {
      form.setErrors({ submit: error.message });
    }
    form.setLoading(false);
  }

  async function deleteDeal(id) {
    form.setLoading(true);
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (!error) {
      fetchDeals();
    } else {
      form.setErrors({ delete: error.message });
    }
    form.setLoading(false);
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Deals</h1>
      {/* Error and success banners */}
      <ErrorBanner
        error={
          form.errors.fetch ||
          form.errors.submit ||
          form.errors.delete ||
          form.errors.title ||
          form.errors.amount
        }
      />
      <SuccessBanner message={form.success} />
      {/* Add deal form */}
      <form onSubmit={addDeal} className="mb-6 flex gap-2 items-center">
        <input
          name="title"
          value={form.values.title}
          onChange={form.handleChange}
          placeholder="Deal title"
          className={`border px-3 py-2 rounded w-1/2 ${
            form.errors.title ? "border-red-400" : ""
          }`}
        />
        <input
          name="amount"
          value={form.values.amount}
          onChange={form.handleChange}
          placeholder="Amount"
          type="number"
          className={`border px-3 py-2 rounded w-1/2 ${
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
      {/* Deals list */}
      {form.loading && <p>Loading...</p>}
      <ul className="divide-y">
        {deals.map((d) => (
          <li key={d.id} className="flex justify-between items-center py-3">
            <span className="font-medium">
              {d.title} <span className="text-gray-500">(${d.amount})</span>
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
