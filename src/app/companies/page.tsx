"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useForm, ErrorBanner, SuccessBanner } from "../../hooks/useForm";

interface Company {
  id: number;
  name: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const form = useForm<{ name: string }, Record<string, string>>({ name: "" });

  useEffect(() => {
    (async () => {
      form.setLoading(true);
      if (!supabase) return;
      const { data, error } = await supabase.from("companies").select("*");
      if (!error) setCompanies(data || []);
      else form.setErrors({ fetch: error?.message ?? "Unknown error" });
      form.setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    form.setLoading(true);
    if (!supabase) return;
    const { error } = await supabase
      .from("companies")
      .insert([{ name: form.values.name }]);
    if (!error) {
      // Refresh list
      if (!supabase) return;
      const { data } = await supabase.from("companies").select("*");
      setCompanies(data || []);
      form.setSuccess("Company added successfully!");
    } else {
      form.setErrors({ submit: error.message });
    }
    form.setLoading(false);
  }

  async function deleteCompany(id: number) {
    form.setLoading(true);
    if (!supabase) return;
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (!error) {
      // Refresh list
      if (!supabase) return;
      const { data } = await supabase.from("companies").select("*");
      setCompanies(data || []);
      form.setSuccess("Company deleted successfully!");
    } else {
      form.setErrors({ delete: error.message });
    }
    form.setLoading(false);
  }
  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Companies</h1>
      <ErrorBanner
        error={
          form.errors.name ||
          form.errors.fetch ||
          form.errors.submit ||
          form.errors.delete
        }
      />
      <SuccessBanner message={form.success} />
      <form onSubmit={addCompany} className="mb-6 flex gap-2 items-center">
        <input
          name="name"
          value={form.values.name}
          onChange={form.handleChange}
          placeholder="New company name"
          className={`border px-3 py-2 rounded w-full ${
            form.errors.name ? "border-red-400" : ""
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
        {companies.map((c: Company) => (
          <li key={c.id} className="flex justify-between items-center py-3">
            <span className="font-medium">{c.name}</span>
            <button
              onClick={() => deleteCompany(c.id)}
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
