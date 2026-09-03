import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // Use service role key if available, otherwise anon key
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });

    // Only fetch vouchers that are ALREADY USED (is_used = true)
    const { data, error } = await supabase
      .from("vouchers")
      .select("id, code, pin, expiration_date, circuit, is_used, used_at, movie_title, movie_poster_url, viewing_date, pdf_filename, pdf_storage_path, created_at, updated_at")
      .eq("is_used", true)
      .order("viewing_date", { ascending: false });

    if (error) {
      console.error("Errore recupero voucher pubblici:", error);
      return NextResponse.json({ vouchers: [] }, { status: 500 });
    }

    return NextResponse.json({ vouchers: data || [] });
  } catch (err: any) {
    console.error("Errore server recupero voucher:", err);
    return NextResponse.json({ vouchers: [] }, { status: 500 });
  }
}
