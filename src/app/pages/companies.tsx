import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useForm, ErrorBanner, SuccessBanner } from "../../hooks/useForm";

// Company type
interface Company {
  id: number;
  name: string;
}

// Form error type
interface FormErrors {
  name?: string;
  fetch?: string;
  submit?: string;
  delete?: string;
  [key: string]: string | undefined;
}

export default function CompaniesPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);

  const form = useForm<{ name: string }, FormErrors>({ name: "" });

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    form.setLoading(true);
    const { data, error } = await supabase
      .from<Company, Company>("companies") // <-- Two type arguments
      .select("*");
    if (!error) setCompanies(data || []);
    else form.setErrors({ fetch: error.message });
    form.setLoading(false);
  }

  async function addCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.validate({ name: (v) => (!v ? "Company name required" : "") }))
      return;

    form.setLoading(true);
    const { error } = await supabase
      .from<Company, Company>("companies") // <-- Two type arguments
      .insert([{ name: form.values.name }]);
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
    const { error } = await supabase
      .from<Company, Company>("companies") // <-- Two type arguments
      .delete()
      .eq("id", id);
    if (!error) fetchCompanies();
    else form.setErrors({ delete: error.message });
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
