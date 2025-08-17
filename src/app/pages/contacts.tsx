import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useForm, ErrorBanner, SuccessBanner } from "../../hooks/useForm";

// Contact type
interface Contact {
  id: number;
  name: string;
  email: string;
}

// Form error type
interface FormErrors {
  name?: string;
  email?: string;
  fetch?: string;
  submit?: string;
  delete?: string;
}

export default function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Typed useForm
  const form = useForm<{ name: string; email: string }, FormErrors>({
    name: "",
    email: "",
  });

  // Fetch contacts on mount
  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    form.setLoading(true);
    const { data, error } = await supabase
      .from<Contact>("contacts")
      .select("*");
    if (!error) setContacts(data || []);
    else form.setErrors({ fetch: error.message });
    form.setLoading(false);
  }

  async function addContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Validate form
    if (
      !form.validate({
        name: (v) => (!v ? "Name required" : ""),
        email: (v) =>
          !v ? "Email required" : /.+@.+\..+/.test(v) ? "" : "Invalid email",
      })
    )
      return;

    form.setLoading(true);
    const { error } = await supabase
      .from("contacts")
      .insert({ name: form.values.name, email: form.values.email });
    if (!error) {
      form.setValues({ name: "", email: "" });
      form.setSuccess("Contact added!");
      fetchContacts();
    } else {
      form.setErrors({ submit: error.message });
    }
    form.setLoading(false);
  }

  async function deleteContact(id: number) {
    form.setLoading(true);
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (!error) fetchContacts();
    else form.setErrors({ delete: error.message });
    form.setLoading(false);
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Contacts</h1>

      <ErrorBanner
        error={
          form.errors.name ||
          form.errors.email ||
          form.errors.fetch ||
          form.errors.submit ||
          form.errors.delete
        }
      />
      <SuccessBanner message={form.success} />

      <form onSubmit={addContact} className="mb-6 flex gap-2 items-center">
        <input
          name="name"
          value={form.values.name}
          onChange={form.handleChange}
          placeholder="Name"
          className={`border px-3 py-2 rounded w-1/2 ${
            form.errors.name ? "border-red-400" : ""
          }`}
        />
        <input
          name="email"
          value={form.values.email}
          onChange={form.handleChange}
          placeholder="Email"
          className={`border px-3 py-2 rounded w-1/2 ${
            form.errors.email ? "border-red-400" : ""
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
        {contacts.map((c) => (
          <li key={c.id} className="flex justify-between items-center py-3">
            <span className="font-medium">
              {c.name} <span className="text-gray-500">({c.email})</span>
            </span>
            <button
              onClick={() => deleteContact(c.id)}
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
