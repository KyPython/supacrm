"use client";
import { useAuth } from "@/context/AuthContext.js";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import Home from "@/app/home/page";
import BusinessIcon from "@mui/icons-material/Business";
import PeopleIcon from "@mui/icons-material/People";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import FolderIcon from "@mui/icons-material/Folder";
import TaskIcon from "@mui/icons-material/Task";
import AddIcon from "@mui/icons-material/Add";
import ModalWrapper from "@/components/ModalWrapper";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function validateEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}
function validatePhone(phone: string) {
  return /^\+?[0-9 \-]{7,20}$/.test(phone);
}

export default function Page() {
  const { user, logout, loading } = useAuth() ?? {};
  const [stats, setStats] = useState({
    companies: 0,
    contacts: 0,
    deals: 0,
    tasks: 0,
    files: 0,
  });
  const [showNewContact, setShowNewContact] = useState(false);
  const [showUploadFile, setShowUploadFile] = useState(false);
  const [creating, setCreating] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>(
    {}
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function fetchCounts() {
    if (!user) return;
    try {
      const [companies, contacts, deals, tasks, files] = await Promise.all([
        supabase
          ?.from("companies")
          .select("id", { count: "exact", head: true }),
        supabase?.from("contacts").select("id", { count: "exact", head: true }),
        supabase?.from("deals").select("id", { count: "exact", head: true }),
        supabase?.from("tasks").select("id", { count: "exact", head: true }),
        supabase?.from("files").select("id", { count: "exact", head: true }),
      ] as any);
      setStats({
        companies: companies?.count ?? 0,
        contacts: contacts?.count ?? 0,
        deals: deals?.count ?? 0,
        tasks: tasks?.count ?? 0,
        files: files?.count ?? 0,
      });
    } catch (e) {
      console.error("Failed to load stats", e);
      toast.error("Failed to load stats");
    }
  }

  useEffect(() => {
    fetchCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function validateContact() {
    const errs: Record<string, string> = {};
    if (!contactForm.name.trim()) errs.name = "Name is required";
    if (contactForm.email && !validateEmail(contactForm.email))
      errs.email = "Invalid email";
    if (contactForm.phone && !validatePhone(contactForm.phone))
      errs.phone = "Invalid phone";
    setContactErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCreateContact() {
    if (!validateContact()) {
      toast.error("Fix form errors");
      return;
    }
    setCreating(true);
    // optimistic
    setStats((s) => ({ ...s, contacts: s.contacts + 1 }));
    toast.info("Creating contact...");
    track("create_contact_attempt", {});
    try {
      if (!supabase) throw new Error("No supabase");
      const parts = (contactForm.name || "").trim().split(/\s+/);
      const first_name = parts.shift() || "";
      const last_name = parts.join(" ") || "";
      const payload = {
        first_name,
        last_name,
        email: contactForm.email || null,
        phone: contactForm.phone || null,
        company: contactForm.company || null,
      };
      const { error } = await supabase.from("contacts").insert(payload);
      if (error) throw error;
      toast.success("Contact created");
      track("create_contact_success", {});
      setContactForm({ name: "", email: "", phone: "", company: "" });
      setShowNewContact(false);
      // refresh counts
      fetchCounts();
    } catch (e: any) {
      console.error("create contact failed", e);
      setStats((s) => ({ ...s, contacts: Math.max(0, s.contacts - 1) }));
      toast.error("Failed to create contact");
      track("create_contact_error", { message: e?.message || String(e) });
    } finally {
      setCreating(false);
    }
  }

  async function handleFileUpload() {
    if (!selectedFile) {
      toast.error("Select a file");
      return;
    }
    setCreating(true);
    toast.info("Uploading file...");
    track("upload_file_attempt", { filename: selectedFile.name });
    setUploadProgress(2);

    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: selectedFile.name }),
      });
      const signJson = await signRes.json();
      if (!signRes.ok || !signJson?.signedUrl)
        throw new Error(signJson?.error || "Failed to sign upload");
      const signedUrl: string = signJson.signedUrl;
      const key = signJson.path;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("x-upsert", "false");
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setUploadProgress(pct);
          } else {
            setUploadProgress((p) => Math.min(95, p + 5));
          }
        };
        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              if (!supabase) throw new Error("No supabase");
              let publicUrl: string | null = null;
              try {
                const pub = await (supabase as any).storage
                  .from("uploads")
                  .getPublicUrl(key);
                publicUrl = pub?.data?.publicUrl ?? pub?.publicURL ?? null;
              } catch (e) {}

              const { error: metaErr } = await supabase.from("files").insert({
                name: selectedFile.name,
                path: key,
                size: selectedFile.size,
                bucket_name: "uploads",
                original_name: selectedFile.name,
                file_path: key,
                file_size: selectedFile.size,
                mime_type: selectedFile.type || "application/octet-stream",
                public_url: publicUrl,
              });
              if (metaErr) throw metaErr;
              setUploadProgress(100);
              toast.success("File uploaded");
              track("upload_file_success", { filename: selectedFile.name });
              fetchCounts();
              setSelectedFile(null);
              setShowUploadFile(false);
              resolve();
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(selectedFile as Blob);
      });
    } catch (e: any) {
      console.error("upload failed", e);
      toast.error("Upload failed: " + (e?.message || e));
      track("upload_file_error", { message: e?.message || String(e) });
    } finally {
      setCreating(false);
      setTimeout(() => setUploadProgress(0), 600);
    }
  }

  if (loading) return <div className="p-6">Checking authentication...</div>;
  if (!user) return <Home />;

  return (
    <div className="flex min-h-screen">
      <ToastContainer position="top-right" autoClose={6000} />
      <nav
        className="w-64"
        style={{
          background: "var(--card)",
          boxShadow: "0 6px 18px rgba(2,6,23,0.06)",
          height: "100vh",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h2 className="text-2xl font-bold mb-6">SupaCRM</h2>
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              href="/dashboard"
              className="block py-2 px-3 rounded nav-link"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <li>
              <Link
                href="/companies"
                className="block py-2 px-3 rounded nav-link"
              >
                Companies
              </Link>
            </li>
          </li>
          <li>
            <li>
              <Link
                href="/contacts"
                className="block py-2 px-3 rounded nav-link"
              >
                Contacts
              </Link>
            </li>
          </li>
          <li>
            <li>
              <Link href="/deals" className="block py-2 px-3 rounded nav-link">
                Deals
              </Link>
            </li>
          </li>
          <li>
            <li>
              <Link href="/files" className="block py-2 px-3 rounded nav-link">
                Files
              </Link>
            </li>
          </li>
          <li>
            <li>
              <Link href="/tasks" className="block py-2 px-3 rounded nav-link">
                Tasks
              </Link>
            </li>
          </li>
        </ul>
        <button
          onClick={logout}
          className="mt-auto"
          style={{
            background: "var(--danger-600)",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: 8,
          }}
        >
          Log out
        </button>
      </nav>

      <main className="flex-1 p-10">
        <div className="app-container">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Welcome, {user?.first_name || user?.email || "User"}!
                </h1>
                <p className="mb-4">
                  Role:{" "}
                  <span className="font-semibold">
                    {String(user?.role || "Not assigned")}
                  </span>
                </p>
              </div>
              <div>
                <button
                  className="inline-flex items-center gap-2 px-3 py-2"
                  onClick={() => setShowNewContact(true)}
                  style={{
                    background: "var(--brand)",
                    color: "var(--fg)",
                    borderRadius: 8,
                  }}
                >
                  <AddIcon fontSize="small" /> New Contact
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-6">
              <Link
                href="/companies"
                className="p-4 rounded shadow text-center hover:shadow-md transition-shadow block"
                style={{ background: "var(--brand-10)" }}
              >
                <h3 className="font-semibold text-lg">
                  <BusinessIcon
                    className="inline-block mr-2"
                    style={{ color: "var(--brand)" }}
                  />{" "}
                  Companies
                </h3>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--brand)" }}
                >
                  {stats.companies}
                </p>
                <div className="mt-2 text-sm" style={{ color: "var(--brand)" }}>
                  View companies →
                </div>
              </Link>

              <div
                className="p-4 rounded shadow text-center hover:shadow-md transition-shadow"
                style={{ background: "var(--success-10)" }}
              >
                <h3 className="font-semibold text-lg">
                  <PeopleIcon
                    className="inline-block mr-2"
                    style={{ color: "var(--success)" }}
                  />{" "}
                  Contacts
                </h3>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--success-600)" }}
                >
                  {stats.contacts}
                </p>
                <div className="mt-2 flex justify-center gap-3">
                  <Link
                    href="/contacts"
                    className="text-sm"
                    style={{ color: "var(--success)" }}
                  >
                    View →
                  </Link>
                  <button
                    className="text-sm"
                    style={{
                      color: "white",
                      background: "var(--success)",
                      padding: "0.25rem 0.5rem",
                      borderRadius: 6,
                    }}
                    onClick={() => setShowNewContact(true)}
                  >
                    New contact
                  </button>
                </div>
              </div>

              <Link
                href="/deals"
                className="p-4 rounded shadow text-center hover:shadow-md transition-shadow block"
                style={{ background: "var(--warning-10)" }}
              >
                <h3 className="font-semibold text-lg">
                  <LocalOfferIcon
                    className="inline-block mr-2"
                    style={{ color: "var(--warning)" }}
                  />{" "}
                  Deals
                </h3>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--warning-600)" }}
                >
                  {stats.deals}
                </p>
                <div
                  className="mt-2 text-sm"
                  style={{ color: "var(--warning)" }}
                >
                  View deals →
                </div>
              </Link>

              <div
                className="p-4 rounded shadow text-center hover:shadow-md transition-shadow"
                style={{ background: "var(--indigo-10)" }}
              >
                <h3 className="font-semibold text-lg">
                  <FolderIcon
                    className="inline-block mr-2"
                    style={{ color: "var(--indigo)" }}
                  />{" "}
                  Files
                </h3>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--indigo-600)" }}
                >
                  {stats.files}
                </p>
                <div className="mt-2 flex justify-center gap-3">
                  <Link
                    href="/files"
                    className="text-sm"
                    style={{ color: "var(--indigo)" }}
                  >
                    View →
                  </Link>
                  <button
                    className="text-sm"
                    style={{
                      color: "white",
                      background: "var(--indigo)",
                      padding: "0.25rem 0.5rem",
                      borderRadius: 6,
                    }}
                    onClick={() => setShowUploadFile(true)}
                  >
                    Upload file
                  </button>
                </div>
              </div>

              <Link
                href="/tasks"
                className="p-4 rounded shadow text-center hover:shadow-md transition-shadow block"
                style={{ background: "var(--purple-10)" }}
              >
                <h3 className="font-semibold text-lg">
                  <TaskIcon
                    className="inline-block mr-2"
                    style={{ color: "var(--purple-600)" }}
                  />{" "}
                  Tasks
                </h3>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--purple-600)" }}
                >
                  {stats.tasks}
                </p>
                <div
                  className="mt-2 text-sm"
                  style={{ color: "var(--purple-600)" }}
                >
                  View tasks →
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* New Contact Modal */}
        {showNewContact && (
          <ModalWrapper onClose={() => setShowNewContact(false)}>
            <div className="bg-white rounded shadow p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-2">New contact</h3>

              <label className="block text-sm">Name</label>
              <input
                value={contactForm.name}
                onChange={(e) =>
                  setContactForm((s) => ({ ...s, name: e.target.value }))
                }
                className="mt-1 mb-3 w-full border rounded px-3 py-2"
              />
              {contactErrors.name && (
                <div className="text-red-600 text-sm">{contactErrors.name}</div>
              )}

              <label className="block text-sm">Email</label>
              <input
                value={contactForm.email}
                onChange={(e) =>
                  setContactForm((s) => ({ ...s, email: e.target.value }))
                }
                className="mt-1 mb-3 w-full border rounded px-3 py-2"
              />
              {contactErrors.email && (
                <div className="text-red-600 text-sm">
                  {contactErrors.email}
                </div>
              )}

              <label className="block text-sm">Phone</label>
              <input
                value={contactForm.phone}
                onChange={(e) =>
                  setContactForm((s) => ({ ...s, phone: e.target.value }))
                }
                className="mt-1 mb-3 w-full border rounded px-3 py-2"
              />
              {contactErrors.phone && (
                <div className="text-red-600 text-sm">
                  {contactErrors.phone}
                </div>
              )}

              <label className="block text-sm">Company</label>
              <input
                value={contactForm.company}
                onChange={(e) =>
                  setContactForm((s) => ({ ...s, company: e.target.value }))
                }
                className="mt-1 mb-3 w-full border rounded px-3 py-2"
              />

              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-1"
                  onClick={() => setShowNewContact(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1 bg-green-600 text-white rounded"
                  onClick={handleCreateContact}
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {/* Upload File Modal */}
        {showUploadFile && (
          <ModalWrapper onClose={() => setShowUploadFile(false)}>
            <div className="bg-white rounded shadow p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-2">Upload file</h3>
              <label className="block text-sm">File</label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="mt-1 mb-3 w-full"
              />

              {uploadProgress > 0 && (
                <div className="w-full bg-gray-100 rounded overflow-hidden mb-3">
                  <div
                    style={{ width: `${uploadProgress}%` }}
                    className="h-2 bg-teal-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-1"
                  onClick={() => setShowUploadFile(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1 bg-indigo-600 text-white rounded"
                  onClick={handleFileUpload}
                >
                  {creating ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}
      </main>
    </div>
  );
}
