// API route to check and optionally create storage bucket
// This requires SUPABASE_SERVICE_ROLE_KEY (server-side only)
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin client not available. Check SUPABASE_SERVICE_ROLE_KEY in .env.local" },
        { status: 500 }
      );
    }

    const bucketName = "files";
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      return NextResponse.json(
        { error: `Failed to list buckets: ${listError.message}` },
        { status: 500 }
      );
    }

    const bucketExists = buckets?.some((b) => b.name === bucketName);

    if (bucketExists) {
      return NextResponse.json({
        success: true,
        message: `Bucket '${bucketName}' already exists`,
        bucket: bucketName,
      });
    }

    // Create the bucket
    const { data, error } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: false, // Private bucket - users can only access their own files
      fileSizeLimit: 52428800, // 50MB limit
      allowedMimeTypes: null, // Allow all file types
    });

    if (error) {
      return NextResponse.json(
        { error: `Failed to create bucket: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Bucket '${bucketName}' created successfully`,
      bucket: bucketName,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unknown error occurred" },
      { status: 500 }
    );
  }
}

