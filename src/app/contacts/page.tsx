"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useAuth, AuthProvider } from "@/context/AuthContext.js";
import { useForm, ErrorBanner, SuccessBanner } from "../../hooks/useForm";
import { supabase } from "@/lib/supabase";

type Contact = {
  id: any;
  name: string;
  email: string;
};

export default function ContactsPage() {
  const auth = useAuth() ?? {};
  const { user, loading, login, signUp, sendMagicLink, logout } = auth;
  const [contacts, setContacts] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [contactsLoading, setContactsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    setContactsLoading(true);
    setError("");
    if (!supabase) return;
    const { data, error } = await supabase.from("contacts").select("*");
    if (!error) setContacts(data || []);
    else setError(error.message);
    setContactsLoading(false);
  }

  async function addContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!name) {
      setError("Name required");
      return;
    }
    if (!email) {
      setError("Email required");
      return;
    }
    setContactsLoading(true);
    // Use Supabase RPC to add client
    if (!supabase) return;
    const { data, error } = await supabase.rpc("update_user_profile", {
      p_first_name: name,
      p_phone: email, // Assuming email is used for phone, adjust as needed
    });
    if (!error) {
      setName("");
      setEmail("");
      setSuccess("Client added!");
      fetchContacts();
    } else {
      setError(error.message);
    }
    setContactsLoading(false);
  }

  async function deleteContact(id: number) {
    setContactsLoading(true);
    setError("");
    if (!supabase) return;
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (!error) fetchContacts();
    else setError(error.message);
    setContactsLoading(false);
  }

  return (
    <AuthProvider>
      <div className="p-8 max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Contacts</h1>
        {error && (
          <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-700 p-2 mb-2 rounded">
            {success}
          </div>
        )}
        <form onSubmit={addContact} className="mb-6 flex gap-2 items-center">
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className={`border px-3 py-2 rounded w-full ${
              error ? "border-red-400" : ""
            }`}
          />
          <input
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={`border px-3 py-2 rounded w-full ${
              error ? "border-red-400" : ""
            }`}
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-5 py-2 rounded shadow"
            disabled={contactsLoading}
          >
            Add
          </button>
        </form>
        {contactsLoading && <p>Loading...</p>}
        <ul className="divide-y">
          {contacts.map((c) => (
            <li key={c.id} className="flex justify-between items-center py-3">
              <span className="font-medium">
                {c.name} <span className="text-gray-500">({c.email})</span>
              </span>
              <button
                onClick={() => deleteContact(c.id)}
                className="text-red-500 hover:underline"
                disabled={contactsLoading}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </AuthProvider>
  );
}
