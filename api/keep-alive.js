// api/keep-alive.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      status: "error",
      message: "Supabase credentials not configured in environment variables",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });

    const startTime = Date.now();

    // Query reale su una tabella esistente per generare attività su Supabase Cloud
    const { data, error } = await supabase
      .from("vouchers")
      .select("id")
      .limit(1);

    if (error) throw error;

    return res.status(200).json({
      status: "ok",
      message: "Supabase pinged successfully to prevent inactivity pause",
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - startTime,
      itemsFound: data ? data.length : 0,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Failed to ping Supabase database",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
}
