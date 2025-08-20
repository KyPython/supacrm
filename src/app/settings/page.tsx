"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext.js";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

export default function SettingsPage() {
  const { user } = useAuth() ?? {};
  const searchParams = useSearchParams?.();
  const debug = !!searchParams?.get?.("__debug");
  // in debug mode expose a fake user so UI renders without auth; saves use localStorage
  const debugUser: {
    id: string;
    email: string;
    first_name: string;
    full_name: string;
  } | null = debug
    ? {
        id: "debug-user",
        email: "debug@example.com",
        first_name: "Debug",
        full_name: "Debug User",
      }
    : null;
  const effectiveUser = (user as any) ?? debugUser;
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    weekly: false,
  });
  const [security, setSecurity] = useState({
    sessionTimeout: 30,
    passwordExpiry: 90,
  });

  useEffect(() => {
    const init = async () => {
      if (!effectiveUser) {
        setLoading(false);
        return;
      }

      if (!supabase) {
        console.error("Supabase client not available");
        setLoading(false);
        return;
      }

      // seed profile fields from `profiles` (AuthProvider already merged profile into user)
      setProfile({
        firstName:
          (effectiveUser &&
            (effectiveUser.first_name || (effectiveUser as any).firstName)) ||
          "",
        lastName:
          (effectiveUser &&
            (effectiveUser.last_name || (effectiveUser as any).lastName)) ||
          "",
        email: (effectiveUser && ((effectiveUser as any).email || "")) || "",
      });

      try {
        if (debug) {
          // load from localStorage in debug mode
          const raw = localStorage.getItem("settings_debug");
          const parsed = raw ? JSON.parse(raw) : null;
          if (parsed?.notifications) {
            setNotifications(parsed.notifications);
          }
          if (parsed?.security) {
            setSecurity(parsed.security);
          }
        } else {
          const res = await supabase
            .from("user_settings")
            .select("*")
            .eq("id", effectiveUser.id)
            .single();
          const data = (res as any)?.data ?? null;
          const fetchErr = (res as any)?.error ?? null;
          if (fetchErr && fetchErr.code !== "PGRST116") {
            // PGRST116 = No rows found for single() in some Supabase versions; ignore
            console.warn("Failed to fetch user settings (ignored)", fetchErr);
          }
          if (data) {
            setNotifications({
              email: data.email_notifications ?? true,
              sms: data.sms_notifications ?? false,
              weekly: data.weekly_reports ?? false,
            });
            setSecurity({
              sessionTimeout: data.session_timeout ?? 30,
              passwordExpiry: data.password_expiry ?? 90,
            });
          }
        }
        if (fetchErr && fetchErr.code !== "PGRST116") {
          // PGRST116 = No rows found for single() in some Supabase versions; ignore
          console.warn("Failed to fetch user settings (ignored)", fetchErr);
        }
        if (data) {
          setNotifications({
            email: data.email_notifications ?? true,
            sms: data.sms_notifications ?? false,
            weekly: data.weekly_reports ?? false,
          });
          setSecurity({
            sessionTimeout: data.session_timeout ?? 30,
            passwordExpiry: data.password_expiry ?? 90,
          });
        }
      } catch (err) {
        console.error("Error loading user settings:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user, searchParams]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUser) return setError("Not authenticated");
    setSaving(true);
    setError("");
    try {
      if (debug) {
        // save to localStorage in debug mode
        const saved = JSON.parse(
          localStorage.getItem("settings_debug") || "{}"
        );
        saved.profile = profile;
        localStorage.setItem("settings_debug", JSON.stringify(saved));
        console.info("Profile saved (debug)");
      } else {
        if (!supabase) throw new Error("Supabase client not available");
        const { error: updErr } = await supabase
          .from("user_profiles")
          .update({
            first_name: profile.firstName,
            last_name: profile.lastName,
          })
          .eq("id", (effectiveUser as any).id);
        if (updErr) throw updErr;
        console.info("Profile saved");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    if (!effectiveUser) return setError("Not authenticated");
    setSaving(true);
    setError("");
    try {
      if (debug) {
        const saved = JSON.parse(
          localStorage.getItem("settings_debug") || "{}"
        );
        saved.notifications = notifications;
        localStorage.setItem("settings_debug", JSON.stringify(saved));
        console.info("Notifications saved (debug)");
      } else {
        if (!supabase) throw new Error("Supabase client not available");
        const payload = {
          id: (effectiveUser as any).id,
          email_notifications: notifications.email,
          sms_notifications: notifications.sms,
          weekly_reports: notifications.weekly,
        };
        // upsert with onConflict to ensure id is used for conflict resolution
        const { error: upsertErr } = await supabase
          .from("user_settings")
          .upsert([payload], { onConflict: "id" });
        if (upsertErr) throw upsertErr;
        console.info("Notifications saved");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save notifications");
    } finally {
      setSaving(false);
    }
  };

  const saveSecurity = async () => {
    if (!effectiveUser) return setError("Not authenticated");
    setSaving(true);
    setError("");
    try {
      if (debug) {
        const saved = JSON.parse(
          localStorage.getItem("settings_debug") || "{}"
        );
        saved.security = security;
        localStorage.setItem("settings_debug", JSON.stringify(saved));
        console.info("Security saved (debug)");
      } else {
        if (!supabase) throw new Error("Supabase client not available");
        const payload = {
          id: (effectiveUser as any).id,
          session_timeout: security.sessionTimeout,
          password_expiry: security.passwordExpiry,
        };
        const { error: upsertErr } = await supabase
          .from("user_settings")
          .upsert([payload], { onConflict: "id" });
        if (upsertErr) throw upsertErr;
        console.info("Security saved");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save security settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      {error && <div className="text-red-600 mb-3">{error}</div>}

      <div className="border rounded bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <nav className="flex space-x-4">
            <button
              className={`py-2 px-3 ${
                activeTab === 0 ? "border-b-2 border-blue-500" : ""
              }`}
              onClick={() => setActiveTab(0)}
            >
              Profile
            </button>
            <button
              className={`py-2 px-3 ${
                activeTab === 1 ? "border-b-2 border-blue-500" : ""
              }`}
              onClick={() => setActiveTab(1)}
            >
              Notifications
            </button>
            <button
              className={`py-2 px-3 ${
                activeTab === 2 ? "border-b-2 border-blue-500" : ""
              }`}
              onClick={() => setActiveTab(2)}
            >
              Security
            </button>
          </nav>
        </div>

        <div className="p-4">
          {activeTab === 0 && (
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">
                    First name
                  </label>
                  <input
                    value={profile.firstName}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, firstName: e.target.value }))
                    }
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Last name</label>
                  <input
                    value={profile.lastName}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, lastName: e.target.value }))
                    }
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  value={profile.email}
                  disabled
                  className="mt-1 block w-full border rounded px-3 py-2 bg-gray-50"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          )}

          {activeTab === 1 && (
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={() =>
                    setNotifications((n) => ({ ...n, email: !n.email }))
                  }
                />
                <span>Email notifications</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={notifications.sms}
                  onChange={() =>
                    setNotifications((n) => ({ ...n, sms: !n.sms }))
                  }
                />
                <span>SMS notifications</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={notifications.weekly}
                  onChange={() =>
                    setNotifications((n) => ({ ...n, weekly: !n.weekly }))
                  }
                />
                <span>Weekly reports</span>
              </label>

              <div>
                <button
                  onClick={saveNotifications}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Notifications"}
                </button>
              </div>
            </div>
          )}

          {activeTab === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">
                    Session timeout (minutes)
                  </label>
                  <select
                    value={security.sessionTimeout}
                    onChange={(e) =>
                      setSecurity((s) => ({
                        ...s,
                        sessionTimeout: Number(e.target.value),
                      }))
                    }
                    className="mt-1 block w-full border rounded px-3 py-2"
                  >
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                    <option value={120}>120</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Password expiry (days)
                  </label>
                  <select
                    value={security.passwordExpiry}
                    onChange={(e) =>
                      setSecurity((s) => ({
                        ...s,
                        passwordExpiry: Number(e.target.value),
                      }))
                    }
                    className="mt-1 block w-full border rounded px-3 py-2"
                  >
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                    <option value={90}>90</option>
                  </select>
                </div>
              </div>

              <div>
                <button
                  onClick={saveSecurity}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Security"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
