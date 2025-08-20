"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext.js";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import Alert from "@/components/Alert";

export default function SettingsPage() {
  const { user } = useAuth() ?? {};
  const searchParams = useSearchParams();
  const debug = !!searchParams?.get?.("__debug");
  const supabaseAvailable = !!supabase;
  const debugApiEnabled =
    typeof window !== "undefined" && process.env.NODE_ENV !== "production";

  const debugUser = debug
    ? {
        id: "debug-user",
        email: "debug@example.com",
        first_name: "Debug",
        full_name: "Debug User",
      }
    : null;
  const effectiveUser = (user as any) ?? debugUser;
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
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const init = async () => {
      if (!effectiveUser) return setLoading(false);
      if (!supabase) {
        try {
          (await import("@/lib/analytics")).track("supabase_client_missing");
        } catch {}
        return setLoading(false);
      }

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
          const raw = localStorage.getItem("settings_debug");
          const parsed = raw ? JSON.parse(raw) : null;
          if (parsed?.notifications) setNotifications(parsed.notifications);
          if (parsed?.security) setSecurity(parsed.security);
        } else {
          const res = await supabase
            .from("user_settings")
            .select("*")
            .eq("id", effectiveUser.id)
            .single();
          const data = (res as any)?.data ?? null;
          const fetchErr = (res as any)?.error ?? null;
          if (fetchErr && fetchErr.code !== "PGRST116") {
            try {
              (await import("@/lib/analytics")).track(
                "user_settings_fetch_failed",
                { error: String(fetchErr) }
              );
            } catch {}
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
            if (data.theme) {
              try {
                // set theme saved in DB to localStorage so ThemeProvider picks it up
                localStorage.setItem("supa_theme", data.theme);
              } catch (e) {
                /* ignore */
              }
            }
          }
        }
      } catch (err) {
        try {
          (await import("@/lib/analytics")).track("user_settings_load_error", {
            error: String(err),
          });
        } catch {}
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
      const { saveProfileHandler } = await import("./handlers");
      await saveProfileHandler({
        effectiveUser,
        profile: { firstName: profile.firstName, lastName: profile.lastName },
        supabase,
        debug: debug,
        debugApiEnabled,
      });
    } catch (err: any) {
      console.error(err);
      setError(String(err?.message ?? err));
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    if (!effectiveUser) return setError("Not authenticated");
    setSaving(true);
    setError("");
    try {
      const { saveNotificationsHandler } = await import("./handlers");
      await saveNotificationsHandler({
        effectiveUser,
        notifications,
        supabase,
        debug,
        debugApiEnabled,
      });
    } catch (err: any) {
      console.error(err);
      setError(String(err?.message ?? err));
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
        try {
          (await import("@/lib/analytics")).track(
            "settings_security_saved_debug"
          );
        } catch {}
      } else {
        const id = (effectiveUser as any).id;
        const payload = {
          id,
          session_timeout: security.sessionTimeout,
          password_expiry: security.passwordExpiry,
        };
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from("user_settings")
              .upsert(payload, { onConflict: "id" });
            console.debug("[settings] user_settings upsert", { data, error });
            if (error) throw error;
            try {
              (await import("@/lib/analytics")).track(
                "settings_security_saved"
              );
            } catch {}
            return;
          } catch (e) {
            console.warn(
              "[settings] supabase user_settings upsert failed, will try debug API if available",
              e
            );
          }
        }

        if (debugApiEnabled) {
          try {
            const res = await fetch("/api/debug/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, security: payload }),
            });
            const body = await res.json().catch(() => null);
            console.debug("[settings] debug api response (security)", body);
            if (body?.error) throw new Error(String(body.error));
            try {
              (await import("@/lib/analytics")).track(
                "settings_security_saved_debug_api"
              );
            } catch {}
            return;
          } catch (apiErr) {
            console.error("[settings] debug API security save failed", apiErr);
            throw apiErr;
          }
        }
        throw new Error(
          "No available save mechanism (supabase missing and debug API disabled)"
        );
      }
    } catch (err: any) {
      console.error(err);
      setError(String(err?.message ?? err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading settings...</div>;

  return (
    <div className="app-container spaced">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h1 className="h2">Settings</h1>
        </div>

        {!supabaseAvailable && (
          <div className="mb-3">
            <Alert variant="danger">
              Supabase client not configured; settings cannot be saved from this
              build.
              {debugApiEnabled && (
                <span>
                  {" "}
                  Falling back to local debug API for saves in development.
                </span>
              )}
            </Alert>
          </div>
        )}

        {error && (
          <div className="mb-3">
            <Alert variant="danger">{error}</Alert>
          </div>
        )}

        <div
          className="rounded"
          style={{
            background: "var(--surface)",
            boxShadow: "0 1px 3px rgba(2,6,23,0.04)",
          }}
        >
          <div
            style={{
              borderBottom: "1px solid var(--surface-20)",
              padding: "0.75rem 1rem",
            }}
          >
            <nav style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className={`py-2 px-3 ${activeTab === 0 ? "border-b-2" : ""}`}
                onClick={() => setActiveTab(0)}
                style={
                  activeTab === 0
                    ? { borderBottomColor: "var(--brand)" }
                    : undefined
                }
              >
                Profile
              </button>
              <button
                className={`py-2 px-3 ${activeTab === 1 ? "border-b-2" : ""}`}
                onClick={() => setActiveTab(1)}
                style={
                  activeTab === 1
                    ? { borderBottomColor: "var(--brand)" }
                    : undefined
                }
              >
                Notifications
              </button>
              <button
                className={`py-2 px-3 ${activeTab === 2 ? "border-b-2" : ""}`}
                onClick={() => setActiveTab(2)}
                style={
                  activeTab === 2
                    ? { borderBottomColor: "var(--brand)" }
                    : undefined
                }
              >
                Security
              </button>
            </nav>
          </div>

          <div style={{ padding: "1rem" }}>
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
                      className="mt-1 block w-full form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Last name
                    </label>
                    <input
                      value={profile.lastName}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, lastName: e.target.value }))
                      }
                      className="mt-1 block w-full form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input
                    value={profile.email}
                    disabled
                    className="mt-1 block w-full form-input"
                    style={{ background: "var(--card)" }}
                  />
                </div>

                <div>
                  <Button
                    type="submit"
                    className="inline-flex"
                    disabled={saving || !supabaseAvailable}
                    variant="primary"
                  >
                    {saving ? "Saving..." : "Save Profile"}
                  </Button>
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
                  <Button
                    onClick={saveNotifications}
                    disabled={saving || !supabaseAvailable}
                    variant="primary"
                  >
                    {saving ? "Saving..." : "Save Notifications"}
                  </Button>
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
                      className="mt-1 block w-full form-input"
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
                      className="mt-1 block w-full form-input"
                    >
                      <option value={30}>30</option>
                      <option value={60}>60</option>
                      <option value={90}>90</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Button
                    onClick={saveSecurity}
                    disabled={saving || !supabaseAvailable}
                    variant="primary"
                  >
                    {saving ? "Saving..." : "Save Security"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
