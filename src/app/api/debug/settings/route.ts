import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Development-only debug API to upsert/read profile and user_settings using
// the service role key. Do NOT enable in production.
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled in production' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, profile, notifications, security } = body || {};
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const results: Record<string, any> = {};

    if (profile) {
      const { data, error } = await supabaseAdmin.from('user_profiles').upsert([
        { id, first_name: profile.first_name, last_name: profile.last_name, email: profile.email },
      ], { onConflict: 'id' });
      results.profile = { data, error };
    }

    if (notifications || security) {
      const payload: any = { id };
      if (notifications) {
        payload.email_notifications = notifications.email_notifications;
        payload.sms_notifications = notifications.sms_notifications;
        payload.weekly_reports = notifications.weekly_reports;
      }
      if (security) {
        payload.session_timeout = security.session_timeout;
        payload.password_expiry = security.password_expiry;
      }
      const { data, error } = await supabaseAdmin.from('user_settings').upsert([payload], { onConflict: 'id' });
      results.user_settings = { data, error };
    }

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled in production' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id query required' }, { status: 400 });

  const profileRes = await supabaseAdmin.from('user_profiles').select('*').eq('id', id).maybeSingle();
    const settingsRes = await supabaseAdmin.from('user_settings').select('*').eq('id', id).maybeSingle();

    return NextResponse.json({ profile: (profileRes as any)?.data ?? null, settings: (settingsRes as any)?.data ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
