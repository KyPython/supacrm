import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST { filename: string }
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled in production" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { filename } = body || {};
    if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });

    const key = `uploads/${Date.now()}_${filename}`;
    // create a signed upload url using the service role client
    // Note: createSignedUploadUrl is available via storage bucket client in newer supabase-js
    // we call the storage helper on the admin client
    // @ts-ignore - supabase-js may have slightly different typings across versions
    const res = await (supabaseAdmin as any).storage.from("uploads").createSignedUploadUrl(key, { upsert: false });
    if (res?.error) {
      return NextResponse.json({ error: res.error }, { status: 500 });
    }
    const signedUrl = res?.data?.signedUrl ?? res?.data?.signedURL ?? res?.data?.signedURL;

    return NextResponse.json({ ok: true, signedUrl, path: key });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
