"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import type { FileObject } from "@supabase/storage-js";
import { supabase } from "../../lib/supabase";
import Container from "@/components/Container";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useAuth } from "@/context/AuthContext.js";
import { useForm, ErrorBanner, SuccessBanner } from "../../hooks/useForm";

export default function FileUploadPage() {
  // Auth context for current user
  const { user } = useAuth();
  // State for files list
  const [files, setFiles] = useState<FileObject[]>([]);
  // useForm for file upload state, validation, and error handling
  const form = useForm<{ file: File | null }>({ file: null });
  // General error state for non-field errors
  const [generalError, setGeneralError] = useState<string>("");

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneralError("");
    const input = e.currentTarget.elements.namedItem(
      "file"
    ) as HTMLInputElement;
    const file = input?.files?.[0] || null;
    form.setValues({ file });
    // Validate file presence
    if (!form.validate({ file: (f) => (!f ? "File required" : "") })) return;
    form.setLoading(true);
    if (!user) {
      setGeneralError("User not authenticated.");
      form.setLoading(false);
      return;
    }
    if (!form.values.file) {
      setGeneralError("No file selected.");
      form.setLoading(false);
      return;
    }
    const filePath = `${user.id}/${form.values.file.name}`;
    if (!supabase) return;
    const { error } = await supabase.storage
      .from("files")
      .upload(filePath, form.values.file);
    if (!error) {
      fetchFiles();
      form.setValues({ file: null });
      form.setSuccess("File uploaded!");
    } else {
      setGeneralError(error.message);
    }
    form.setLoading(false);
  }

  async function fetchFiles() {
    setGeneralError("");
    if (!user) {
      setGeneralError("User not authenticated.");
      return;
    }
    if (!supabase) return;
    const { data, error } = await supabase.storage
      .from("files")
      .list(user.id + "/");
    if (!error) setFiles((data as FileObject[]) || []);
    else setGeneralError(error.message);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    form.setValues({ file: e.target.files ? e.target.files[0] : null });
  }

  async function handleDownload(fileName: string) {
    setGeneralError("");
    if (!user) {
      setGeneralError("User not authenticated.");
      return;
    }
    if (!supabase) return;
    const { data, error } = await supabase.storage
      .from("files")
      .download(`${user.id}/${fileName}`);
    if (data) {
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      form.setSuccess("Download started");
    } else {
      setGeneralError(error?.message || "Download failed");
    }
  }

  return (
    <Container>
      <Card>
        <h1 className="h1">File Upload</h1>
        {/* Error and success banners */}
        <ErrorBanner error={generalError || form.errors.file} />
        <SuccessBanner message={form.success} />
        {/* File upload form */}
        <form onSubmit={handleUpload} className="mb-6 flex gap-2 items-center">
          <input
            type="file"
            name="file"
            onChange={handleFileChange}
            className={`form-input w-full ${
              form.errors.file ? "border-red-400" : ""
            }`}
          />
          <Button
            type="submit"
            variant="primary"
            className="px-5"
            disabled={form.loading}
          >
            Upload
          </Button>
        </form>
        <Button onClick={fetchFiles} variant="secondary" className="mb-4">
          Refresh Files
        </Button>
        {/* Files list */}
        {form.loading && <p>Loading...</p>}
        <ul className="divide-y">
          {files.map((f) => (
            <li
              key={(f as FileObject).name}
              className="flex justify-between items-center py-3"
            >
              <span className="font-medium">{(f as FileObject).name}</span>
              <button
                onClick={() => handleDownload((f as FileObject).name)}
                style={{ color: "var(--brand)" }}
                className="hover:underline"
                disabled={form.loading}
              >
                Download
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </Container>
  );
}
