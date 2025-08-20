// The Supabase client exposes a `from()` builder whose methods are awaitable
// but use complex Postgrest types; accept `any` here to keep the handlers
// flexible and avoid tight coupling to client types in this small helper.
type SupabaseLike = any;

export async function saveNotificationsHandler(opts: {
  effectiveUser: any;
  notifications: { email: boolean; sms: boolean; weekly: boolean };
  supabase: SupabaseLike | null | undefined;
  debug?: boolean;
  debugApiEnabled?: boolean;
}) {
  const { effectiveUser, notifications, supabase, debug, debugApiEnabled } =
    opts;
  if (!effectiveUser) throw new Error("Not authenticated");

  if (debug) {
    const saved = JSON.parse(localStorage.getItem("settings_debug") || "{}");
    saved.notifications = notifications;
    localStorage.setItem("settings_debug", JSON.stringify(saved));
    return { ok: true };
  }

  if (!supabase) throw new Error("Supabase client not available");

  const id = (effectiveUser as any).id;
  const payload = {
    id,
    email_notifications: notifications.email,
    sms_notifications: notifications.sms,
    weekly_reports: notifications.weekly,
  };

  try {
    const res = await (supabase as any).from("user_settings").upsert(payload, {
      onConflict: "id",
    });
    const upsertErr = res?.error ?? null;
    if (upsertErr) throw upsertErr;
    return { ok: true };
  } catch (errUpsert) {
    if (debugApiEnabled) {
      const res = await fetch("/api/debug/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notifications: payload }),
      });
      const body = await res.json().catch(() => null);
      if (body?.error) throw new Error(String(body.error));
      return { ok: true };
    }

    try {
      await (supabase as any)
        .from("user_profiles")
        .upsert({ id, email: (effectiveUser as any).email || null }, { onConflict: "id" });
      const retry = await (supabase as any).from("user_settings").upsert(payload, {
        onConflict: "id",
      });
      const retryErr = retry?.error ?? null;
      if (retryErr) throw retryErr;
      return { ok: true };
    } catch (e) {
      throw errUpsert;
    }
  }
}

export async function saveProfileHandler(opts: {
  effectiveUser: any;
  profile: { firstName: string; lastName: string };
  supabase: SupabaseLike | null | undefined;
  debug?: boolean;
  debugApiEnabled?: boolean;
}) {
  const { effectiveUser, profile, supabase, debug, debugApiEnabled } = opts;
  if (!effectiveUser) throw new Error("Not authenticated");

  if (debug) {
    const saved = JSON.parse(localStorage.getItem("settings_debug") || "{}");
    saved.profile = profile;
    localStorage.setItem("settings_debug", JSON.stringify(saved));
    return { ok: true };
  }

  const id = (effectiveUser as any).id;
  const payload = {
    id,
    first_name: profile.firstName,
    last_name: profile.lastName,
    email: (effectiveUser as any).email || null,
  };

  if (debugApiEnabled) {
    try {
      const res = await fetch("/api/debug/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, profile: payload }),
      });
      const body = await res.json().catch(() => null);
      if (body?.error) throw new Error(String(body.error));
      return { ok: true };
    } catch (err) {}
  }

  if (!supabase) throw new Error("No available save mechanism (supabase missing and debug API disabled)");

  try {
    const res = await (supabase as any).from("user_profiles").upsert(payload, { onConflict: "id" });
    const err = res?.error ?? null;
    if (err) throw err;
    return { ok: true };
  } catch (e) {
    if (debugApiEnabled) {
      const res = await fetch("/api/debug/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, profile: payload }),
      });
      const body = await res.json().catch(() => null);
      if (body?.error) throw new Error(String(body.error));
      return { ok: true };
    }
    throw e;
  }
}
