"use client";
import { useAuth } from "@/context/AuthContext.js";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
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
      // split full name into first_name / last_name (DB requires last_name NOT NULL)
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
      // Request a signed upload URL from our server-side endpoint
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

      // Upload using XHR to get progress events
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
              // write metadata to DB
              if (!supabase) throw new Error("No supabase");
              // attempt to derive a public URL if bucket is public
              let publicUrl: string | null = null;
              try {
                const pub = await (supabase as any).storage
                  .from("uploads")
                  .getPublicUrl(key);
                publicUrl = pub?.data?.publicUrl ?? pub?.publicURL ?? null;
              } catch (e) {
                // ignore — bucket may be private or getPublicUrl not available
              }

              const { error: metaErr } = await supabase.from("files").insert({
                name: selectedFile.name,
                path: key,
                size: selectedFile.size,
                bucket_name: "uploads",
                original_name: selectedFile.name,
                file_path: key,
                file_size: selectedFile.size,
                mime_type: selectedFile.type || "application/octet-stream",
                // store public url when available to make client links easier
                // keep null when not available
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
  if (!user) return <div className="p-6">Not authenticated</div>;

  return (
    <div className="flex min-h-screen">
      <ToastContainer position="top-right" autoClose={6000} />
      <nav className="w-64 bg-white shadow-lg h-screen p-6 flex flex-col gap-4">
        <h2 className="text-2xl font-bold mb-6">SupaCRM</h2>
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              href="/dashboard"
              className="block py-2 px-3 rounded hover:bg-gray-100"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              href="/companies"
              className="block py-2 px-3 rounded hover:bg-gray-100"
            >
              Companies
            </Link>
          </li>
          <li>
            <Link
              href="/contacts"
              className="block py-2 px-3 rounded hover:bg-gray-100"
            >
              Contacts
            </Link>
          </li>
          <li>
            <Link
              href="/deals"
              className="block py-2 px-3 rounded hover:bg-gray-100"
            >
              Deals
            </Link>
          </li>
          <li>
            <Link
              href="/files"
              className="block py-2 px-3 rounded hover:bg-gray-100"
            >
              Files
            </Link>
          </li>
          <li>
            <Link
              href="/tasks"
              className="block py-2 px-3 rounded hover:bg-gray-100"
            >
              Tasks
            </Link>
          </li>
        </ul>
        <button
          onClick={logout}
          className="mt-auto bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
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
                className="inline-flex items-center gap-2 px-3 py-2 bg-teal-500 text-white rounded"
                onClick={() => {
                  setShowNewContact(true);
                }}
              >
                <AddIcon fontSize="small" /> New Contact
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-6">
            <Link
              href="/companies"
              className="bg-blue-50 p-4 rounded shadow text-center hover:shadow-md transition-shadow block"
            >
              <h3 className="font-semibold text-lg">
                <BusinessIcon className="inline-block mr-2 text-teal-600" />{" "}
                Companies
              </h3>
              <p className="text-2xl font-bold text-blue-700">
                {stats.companies}
              </p>
              <div className="mt-2 text-sm text-blue-600">View companies →</div>
            </Link>

            <div className="bg-green-50 p-4 rounded shadow text-center hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg">
                <PeopleIcon className="inline-block mr-2 text-green-600" />{" "}
                Contacts
              </h3>
              <p className="text-2xl font-bold text-green-700">
                {stats.contacts}
              </p>
              <div className="mt-2 flex justify-center gap-3">
                <Link href="/contacts" className="text-sm text-green-600">
                  View →
                </Link>
                <button
                  className="text-sm text-white bg-green-600 px-2 py-1 rounded"
                  onClick={() => setShowNewContact(true)}
                >
                  New contact
                </button>
              </div>
            </div>

            <Link
              href="/deals"
              className="bg-yellow-50 p-4 rounded shadow text-center hover:shadow-md transition-shadow block"
            >
              <h3 className="font-semibold text-lg">
                <LocalOfferIcon className="inline-block mr-2 text-yellow-600" />{" "}
                Deals
              </h3>
              <p className="text-2xl font-bold text-yellow-700">
                {stats.deals}
              </p>
              <div className="mt-2 text-sm text-yellow-600">View deals →</div>
            </Link>

            <div className="bg-indigo-50 p-4 rounded shadow text-center hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg">
                <FolderIcon className="inline-block mr-2 text-indigo-700" />{" "}
                Files
              </h3>
              <p className="text-2xl font-bold text-indigo-700">
                {stats.files}
              </p>
              <div className="mt-2 flex justify-center gap-3">
                <Link href="/files" className="text-sm text-indigo-600">
                  View →
                </Link>
                <button
                  className="text-sm text-white bg-indigo-600 px-2 py-1 rounded"
                  onClick={() => setShowUploadFile(true)}
                >
                  Upload file
                </button>
              </div>
            </div>

            <Link
              href="/tasks"
              className="bg-purple-50 p-4 rounded shadow text-center hover:shadow-md transition-shadow block"
            >
              <h3 className="font-semibold text-lg">
                <TaskIcon className="inline-block mr-2 text-purple-600" /> Tasks
              </h3>
              <p className="text-2xl font-bold text-purple-700">
                {stats.tasks}
              </p>
              <div className="mt-2 text-sm text-purple-600">View tasks →</div>
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
                  <div className="text-red-600 text-sm">
                    {contactErrors.name}
                  </div>
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
        </div>
      </main>
    </div>
  );
}
