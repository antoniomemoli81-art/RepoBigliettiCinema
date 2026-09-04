import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      {
        status: "error",
        message: "Supabase credentials not configured in environment variables",
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });

    const startTime = Date.now();

    // Query reale su tabella vouchers per generare attività su Supabase Cloud
    const { data, error } = await supabase
      .from("vouchers")
      .select("id")
      .limit(1);

    if (error) {
      throw error;
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "ok",
        message: "Supabase pinged successfully to prevent inactivity pause",
        timestamp: new Date().toISOString(),
        latency_ms: latencyMs,
        itemsFound: data ? data.length : 0,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (err: any) {
    console.error("Keep-Alive ping error:", err);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to ping Supabase database",
        error: err?.message || String(err),
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
