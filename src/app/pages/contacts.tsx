import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useForm, ErrorBanner, SuccessBanner } from "../../hooks/useForm";

export default function ContactsPage() {
  // Auth context for current user
  const { user } = useAuth();
  // State for contacts list
  const [contacts, setContacts] = useState([]);
  // useForm hook for form state, validation, and error handling
  const form = useForm({ name: "", email: "" });

  useEffect(() => {
    fetchContacts(); // Initial fetch
  }, []);

  async function fetchContacts() {
    form.setLoading(true);
    const { data, error } = await supabase.from("contacts").select("*");
    if (!error) setContacts(data || []);
    else form.setErrors({ fetch: error.message });
    form.setLoading(false);
  }

  async function addContact(e) {
    e.preventDefault();
    // Validate form: name and email required, email format
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

  async function deleteContact(id) {
    form.setLoading(true);
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (!error) {
      fetchContacts();
    } else {
      form.setErrors({ delete: error.message });
    }
    form.setLoading(false);
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Contacts</h1>
      {/* Error and success banners */}
      <ErrorBanner
        error={
          form.errors.fetch ||
          form.errors.submit ||
          form.errors.delete ||
          form.errors.name ||
          form.errors.email
        }
      />
      <SuccessBanner message={form.success} />
      {/* Add contact form */}
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
      {/* Contacts list */}
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
