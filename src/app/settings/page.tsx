"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext.js";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const { user } = useAuth() ?? {};
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
      if (!user) {
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
        firstName: user.first_name || user.firstName || "",
        lastName: user.last_name || user.lastName || "",
        email: user.email || "",
      });

      try {
        const { data, error: fetchErr } = await supabase
          .from("user_settings")
          .select("*")
          .eq("id", user.id)
          .single();
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
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setError("Not authenticated");
    setSaving(true);
    setError("");
    try {
      if (!supabase) throw new Error("Supabase client not available");
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ first_name: profile.firstName, last_name: profile.lastName })
        .eq("id", user.id);
      if (updErr) throw updErr;
      // update local user fields (UI only)
      console.info("Profile saved");
    } catch (err) {
      console.error(err);
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    if (!user) return setError("Not authenticated");
    setSaving(true);
    setError("");
    try {
      if (!supabase) throw new Error("Supabase client not available");
      const payload = {
        id: user.id,
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
    } catch (err) {
      console.error(err);
      setError("Failed to save notifications");
    } finally {
      setSaving(false);
    }
  };

  const saveSecurity = async () => {
    if (!user) return setError("Not authenticated");
    setSaving(true);
    setError("");
    try {
      if (!supabase) throw new Error("Supabase client not available");
      const payload = {
        id: user.id,
        session_timeout: security.sessionTimeout,
        password_expiry: security.passwordExpiry,
      };
      const { error: upsertErr } = await supabase
        .from("user_settings")
        .upsert([payload], { onConflict: "id" });
      if (upsertErr) throw upsertErr;
      console.info("Security saved");
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
