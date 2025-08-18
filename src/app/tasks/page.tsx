"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { AuthProvider, useAuth } from "@/context/AuthContext.js";
import { useForm, ErrorBanner, SuccessBanner } from "../../hooks/useForm";

function TasksPageContent() {
  // Auth context for current user
  const { user } = useAuth();
  // State for tasks list
  type Task = { id: string; title: string; [key: string]: any };
  const [tasks, setTasks] = useState<Task[]>([]);
  // useForm hook for form state, validation, and error handling
  const form = useForm<{ title: string }>({ title: "" });
  // General error state for non-field errors
  const [generalError, setGeneralError] = useState<string>("");

  useEffect(() => {
    fetchTasks(); // Initial fetch
  }, []);

  async function fetchTasks() {
    form.setLoading(true);
    setGeneralError("");
    const { data, error } = await supabase.from("tasks").select("*");
    if (!error) setTasks(data || []);
    else setGeneralError(error.message);
    form.setLoading(false);
  }

  async function addTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneralError("");
    // Validate form: title required
    if (!form.validate({ title: (v) => (!v ? "Task title required" : "") }))
      return;
    form.setLoading(true);
    const { error } = await supabase
      .from("tasks")
      .insert({ title: form.values.title });
    if (!error) {
      form.setValues({ title: "" });
      form.setSuccess("Task added!");
      fetchTasks();
    } else {
      setGeneralError(error.message);
    }
    form.setLoading(false);
  }

  async function deleteTask(id: string) {
    form.setLoading(true);
    setGeneralError("");
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) {
      fetchTasks();
    } else {
      setGeneralError(error.message);
    }
    form.setLoading(false);
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Tasks</h1>
      {/* Error and success banners */}
      <ErrorBanner error={generalError || form.errors.title} />
      <SuccessBanner message={form.success} />
      {/* Add task form */}
      <form onSubmit={addTask} className="mb-6 flex gap-2 items-center">
        <input
          name="title"
          value={form.values.title}
          onChange={form.handleChange}
          placeholder="Task title"
          className={`border px-3 py-2 rounded w-full ${
            form.errors.title ? "border-red-400" : ""
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
      {/* Tasks list */}
      {form.loading && <p>Loading...</p>}
      <ul className="divide-y">
        {tasks.map((t) => (
          <li key={t.id} className="flex justify-between items-center py-3">
            <span className="font-medium">{t.title}</span>
            <button
              onClick={() => deleteTask(t.id)}
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

export default function TasksPage() {
  return (
    <AuthProvider>
      <TasksPageContent />
    </AuthProvider>
  );
}
