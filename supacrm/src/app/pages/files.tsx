import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useForm, ErrorBanner, SuccessBanner } from "../../hooks/useForm";

export default function FileUploadPage() {
  // Auth context for current user
  const { user } = useAuth();
  // State for files list
  const [files, setFiles] = useState([]);
  // useForm for file upload state, validation, and error handling
  const form = useForm({ file: null });

  async function handleUpload(e) {
    e.preventDefault();
    // Validate file presence
    if (!form.validate({ file: (f) => (!f ? "File required" : "") })) return;
    form.setLoading(true);
    const filePath = `${user.id}/${form.values.file.name}`;
    const { error } = await supabase.storage
      .from("files")
      .upload(filePath, form.values.file);
    if (!error) {
      fetchFiles();
      form.setValues({ file: null });
      form.setSuccess("File uploaded!");
    } else {
      form.setErrors({ submit: error.message });
    }
    form.setLoading(false);
  }

  async function fetchFiles() {
    const { data, error } = await supabase.storage
      .from("files")
      .list(user.id + "/");
    if (!error) setFiles(data || []);
    else form.setErrors({ fetch: error.message });
  }

  function handleFileChange(e) {
    form.setValues({ file: e.target.files[0] });
  }

  async function handleDownload(fileName) {
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
      form.setErrors({ download: error?.message || "Download failed" });
    }
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">File Upload</h1>
      {/* Error and success banners */}
      <ErrorBanner
        error={
          form.errors.fetch ||
          form.errors.submit ||
          form.errors.download ||
          form.errors.file
        }
      />
      <SuccessBanner message={form.success} />
      {/* File upload form */}
      <form onSubmit={handleUpload} className="mb-6 flex gap-2 items-center">
        <input
          type="file"
          name="file"
          onChange={handleFileChange}
          className={`border px-3 py-2 rounded w-full ${
            form.errors.file ? "border-red-400" : ""
          }`}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-5 py-2 rounded shadow"
          disabled={form.loading}
        >
          Upload
        </button>
      </form>
      <button
        onClick={fetchFiles}
        className="mb-4 bg-gray-200 px-3 py-2 rounded shadow"
      >
        Refresh Files
      </button>
      {/* Files list */}
      {form.loading && <p>Loading...</p>}
      <ul className="divide-y">
        {files.map((f) => (
          <li key={f.name} className="flex justify-between items-center py-3">
            <span className="font-medium">{f.name}</span>
            <button
              onClick={() => handleDownload(f.name)}
              className="text-blue-500 hover:underline"
              disabled={form.loading}
            >
              Download
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
