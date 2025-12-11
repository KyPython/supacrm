"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext.js";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import Alert from "@/components/Alert";
import { logger } from "@/lib/logger";
import { usePricing } from "@/hooks/usePricing";
import { useUsage } from "@/hooks/useUsage";

export default function SettingsPage() {
  const { user } = useAuth() ?? {};
  const searchParams = useSearchParams();
  const debug = !!searchParams?.get?.("__debug");
  const supabaseAvailable = !!supabase;
  const debugApiEnabled =
    typeof window !== "undefined" && process.env.NODE_ENV !== "production";
  const { allPricing } = usePricing();
  const { plan: currentPlan, limits, usage, exceeded } = useUsage();

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
  
  // Get billing tab from URL
  const tabParam = searchParams?.get?.("tab");
  const initialTab = tabParam === "billing" ? 3 : 0;

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
  const [activeTab, setActiveTab] = useState(initialTab);

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
            .maybeSingle();
          const data = (res as any)?.data ?? null;
          const fetchErr = (res as any)?.error ?? null;
          // maybeSingle() returns null for missing records, so only log actual errors
          if (fetchErr) {
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
      logger.error('Failed to save profile', err instanceof Error ? err : new Error(String(err)), { userId: effectiveUser?.id });
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
      logger.error('Failed to save notifications', err instanceof Error ? err : new Error(String(err)), { userId: effectiveUser?.id });
      setError(String(err?.message ?? err));
    } finally {
      setSaving(false);
    }
  };

  const saveSecurity = async () => {
    if (!effectiveUser) return setError("Not authenticated");
    
    // Guard against race condition: check for user.id
    const id = (effectiveUser as any)?.id;
    if (!id) {
      return setError("User ID not available - authentication may still be in progress");
    }
    
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
            logger.debug('user_settings upsert', { data, error: error?.message });
            if (error) throw error;
            try {
              (await import("@/lib/analytics")).track(
                "settings_security_saved"
              );
            } catch {}
            return;
          } catch (e) {
            logger.warn('Supabase user_settings upsert failed, will try debug API if available', { error: e instanceof Error ? e.message : String(e) });
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
            logger.debug('Debug API response (security)', { body });
            if (body?.error) throw new Error(String(body.error));
            try {
              (await import("@/lib/analytics")).track(
                "settings_security_saved_debug_api"
              );
            } catch {}
            return;
          } catch (apiErr) {
            logger.error('Debug API security save failed', apiErr instanceof Error ? apiErr : new Error(String(apiErr)), { userId: id });
            throw apiErr;
          }
        }
        throw new Error(
          "No available save mechanism (supabase missing and debug API disabled)"
        );
      }
    } catch (err: any) {
      logger.error('Failed to save security settings', err instanceof Error ? err : new Error(String(err)), { userId: effectiveUser?.id });
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
              <button
                className={`py-2 px-3 ${activeTab === 3 ? "border-b-2" : ""}`}
                onClick={() => setActiveTab(3)}
                style={
                  activeTab === 3
                    ? { borderBottomColor: "var(--brand)" }
                    : undefined
                }
              >
                Billing
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

            {activeTab === 3 && (
              <div className="space-y-6">
                {/* Current Plan */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Current Plan</h3>
                  <div className="p-4 rounded" style={{ background: "var(--card)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-semibold capitalize">{currentPlan || "Free"}</span>
                      {currentPlan && currentPlan !== "free" && (
                        <span className="px-2 py-1 text-xs rounded" style={{ background: "var(--brand-10)", color: "var(--brand)" }}>
                          Active
                        </span>
                      )}
                    </div>
                    {allPricing.find(p => p.plan_type === currentPlan) && (
                      <p className="text-sm" style={{ color: "var(--muted)" }}>
                        {allPricing.find(p => p.plan_type === currentPlan)?.display_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Usage */}
                {limits && usage && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Usage</h3>
                    <div className="space-y-3">
                      {limits.max_contacts !== null && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Contacts</span>
                            <span style={{ color: exceeded?.contacts ? "var(--danger)" : "var(--muted)" }}>
                              {usage.contacts?.toLocaleString() || 0} / {limits.max_contacts?.toLocaleString() || "Unlimited"}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full" style={{ background: "var(--card)" }}>
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, ((usage.contacts || 0) / (limits.max_contacts || 1)) * 100)}%`,
                                background: exceeded?.contacts ? "var(--danger)" : "var(--brand)",
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {limits.max_users !== null && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Users</span>
                            <span style={{ color: exceeded?.users ? "var(--danger)" : "var(--muted)" }}>
                              {usage.users || 0} / {limits.max_users || "Unlimited"}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full" style={{ background: "var(--card)" }}>
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, ((usage.users || 0) / (limits.max_users || 1)) * 100)}%`,
                                background: exceeded?.users ? "var(--danger)" : "var(--brand)",
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {limits.max_storage_bytes !== null && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Storage</span>
                            <span style={{ color: exceeded?.storage_bytes ? "var(--danger)" : "var(--muted)" }}>
                              {((usage.storage_bytes || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB / {((limits.max_storage_bytes || 0) / (1024 * 1024 * 1024)).toFixed(0)} GB
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full" style={{ background: "var(--card)" }}>
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, ((usage.storage_bytes || 0) / (limits.max_storage_bytes || 1)) * 100)}%`,
                                background: exceeded?.storage_bytes ? "var(--danger)" : "var(--brand)",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Manage Subscription</h3>
                  <div className="space-y-3">
                    <Button
                      href="/pricing"
                      variant="primary"
                      className="w-full"
                    >
                      View All Plans
                    </Button>
                    {currentPlan && currentPlan !== "free" && (
                      <p className="text-sm text-center" style={{ color: "var(--muted)" }}>
                        To manage your subscription or payment method, visit your{" "}
                        <a
                          href="https://polar.sh"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                          style={{ color: "var(--brand)" }}
                        >
                          Polar customer portal
                        </a>
                        .
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
