"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext.js";
import { useForm, ErrorBanner, SuccessBanner } from "../../hooks/useForm";
import { supabase } from "@/lib/supabase";
import { useUsage } from "@/hooks/useUsage";
import { checkLimitExceeded, incrementUsage, decrementUsage } from "@/lib/usage-tracking";
import UpgradePrompt, { InlineUpgradePrompt } from "@/components/UpgradePrompt";

type Contact = {
  id: string | number;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
};

export default function ContactsPage() {
  const auth = useAuth() ?? {};
  // Intentionally not destructuring unused auth helpers here to avoid unused-var warnings
  const { user } = auth;
  const { usageStatus, exceeded, plan } = useUsage();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [contactsLoading, setContactsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const mountedRef = useRef(true);

  const fetchContacts = useCallback(async () => {
    setContactsLoading(true);
    setError("");
    if (!supabase) return;
    const { data, error } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email");
    if (!error && mountedRef.current) setContacts((data as Contact[]) || []);
    else if (error) setError(error.message);
    setContactsLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchContacts();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchContacts]);

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
    
    // Check limit before creating
    if (user?.id) {
      const limitExceeded = await checkLimitExceeded(user.id, 'contacts');
      if (limitExceeded) {
        setError("Contact limit reached. Please upgrade your plan to add more contacts.");
        return;
      }
    }
    
    setContactsLoading(true);
    // Insert new contact directly into contacts table
    if (!supabase) return;
    // split name into first and last
    const parts = name.trim().split(/\s+/);
    const first_name = parts.shift() ?? "";
    // DB requires last_name NOT NULL — store empty string when no last name
    const last_name = parts.join(" ") || "";
    const { data: inserted, error } = await supabase
      .from("contacts")
      .insert({ first_name, last_name, email });
    if (!error) {
      // Update usage tracking
      if (user?.id) {
        await incrementUsage(user.id, 'contacts', 1);
      }
      setName("");
      setEmail("");
      setSuccess("Client added!");
      fetchContacts();
    } else {
      setError(error.message);
    }
    setContactsLoading(false);
  }

  async function deleteContact(id: string | number) {
    setContactsLoading(true);
    setError("");
    if (!supabase) return;
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (!error) {
      // Update usage tracking
      if (user?.id) {
        await decrementUsage(user.id, 'contacts', 1);
      }
      fetchContacts();
    } else {
      setError(error.message);
    }
    setContactsLoading(false);
  }

  return (
    <div className="app-container spaced">
      <div className="card">
        <h1 className="h1">Contacts</h1>
        {exceeded?.contacts && usageStatus && (
          <UpgradePrompt
            feature="contacts"
            currentCount={usageStatus.usage.contacts}
            limit={usageStatus.limits.max_contacts || 0}
            className="mb-4"
          />
        )}
        {error && (
          <div className="mb-3">
            <div className="alert alert-danger">{error}</div>
          </div>
        )}
        {success && (
          <div className="mb-3">
            <div className="alert alert-success">{success}</div>
          </div>
        )}
        <form onSubmit={addContact} className="mb-6 flex gap-2 items-center">
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className={`form-input w-full ${error ? "border-red-400" : ""}`}
          />
          <input
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={`form-input w-full ${error ? "border-red-400" : ""}`}
          />
          <button
            type="submit"
            disabled={contactsLoading}
            style={{
              background: "var(--brand)",
              color: "var(--fg)",
              padding: "0.5rem 1.25rem",
              borderRadius: 8,
            }}
          >
            Add
          </button>
        </form>
        {contactsLoading && <p>Loading...</p>}
        <ul className="divide-y">
          {contacts.map((c) => (
            <li key={c.id} className="flex justify-between items-center py-3">
              <span className="font-medium">
                {`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()}{" "}
                <span style={{ color: "var(--muted)" }}>({c.email})</span>
              </span>
              <button
                onClick={() => deleteContact(c.id)}
                disabled={contactsLoading}
                style={{ color: "var(--danger-600)" }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
