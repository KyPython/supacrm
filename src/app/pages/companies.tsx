import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useForm, ErrorBanner, SuccessBanner } from "../../hooks/useForm";

export default function CompaniesPage() {
  // Auth context for current user
  const { user } = useAuth();
  // State for companies list
  const [companies, setCompanies] = useState<any[]>([]);
  // useForm hook for form state, validation, and error handling
  const form = useForm({ name: "" });

  useEffect(() => {
    fetchCompanies(); // Initial fetch
  }, []);

  async function fetchCompanies() {
    form.setLoading(true);
    const { data, error } = await supabase.from("companies").select("*");
    if (!error) setCompanies(data || []);
    else form.setErrors({ fetch: error.message });
    form.setLoading(false);
  }

  async function addCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Validate form: name required
    if (
      !form.validate({
        name: (v: string) => (!v ? "Company name required" : ""),
      })
    )
      return;
    form.setLoading(true);
    const { error } = await supabase
      .from("companies")
      .insert({ name: form.values.name });
    if (!error) {
      form.setValues({ name: "" });
      form.setSuccess("Company added!");
      fetchCompanies();
    } else {
      form.setErrors({ submit: error.message });
    }
    form.setLoading(false);
  }

  async function deleteCompany(id: number) {
    form.setLoading(true);
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (!error) {
      fetchCompanies();
    } else {
      form.setErrors({ delete: error.message });
    }
    form.setLoading(false);
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Companies</h1>
      {/* Error and success banners */}
      <ErrorBanner
        error={
          form.errors.fetch ||
          form.errors.submit ||
          form.errors.delete ||
          form.errors.name
        }
      />
      <SuccessBanner message={form.success} />
      {/* Add company form */}
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
      {/* Companies list */}
      {form.loading && <p>Loading...</p>}
      <ul className="divide-y">
        {companies.map((c) => (
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
