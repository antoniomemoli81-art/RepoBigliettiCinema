import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Percorso del file mancante." }, { status: 400 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });

    // Create a 1-hour signed URL from the 'vouchers' bucket
    const { data, error } = await supabase.storage
      .from("vouchers")
      .createSignedUrl(path, 3600);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: "Impossibile recuperare il file PDF dallo storage Supabase: " + (error?.message || "File non trovato") },
        { status: 404 }
      );
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Errore interno: " + err.message },
      { status: 500 }
    );
  }
}
