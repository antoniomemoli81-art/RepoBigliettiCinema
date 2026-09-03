"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Voucher } from "@/types";
import { formatItalianDate } from "@/lib/pdf-parser";
import { createClient } from "@/lib/supabase/client";
import PdfViewerModal from "@/components/PdfViewerModal";
import { Film, Calendar, FileText, ArrowLeft } from "lucide-react";

export default function HistoryPage() {
  const [usedVouchers, setUsedVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoucherForPdf, setSelectedVoucherForPdf] = useState<Voucher | null>(null);

  useEffect(() => {
    async function loadUsedVouchers() {
      setLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from("vouchers")
            .select("*")
            .eq("is_used", true)
            .order("viewing_date", { ascending: false });

          if (!error && data) {
            setUsedVouchers(data as Voucher[]);
            setLoading(false);
            return;
          }
        }

        // Public fallback for used vouchers
        const res = await fetch("/api/vouchers/public");
        const json = await res.json();
        setUsedVouchers(json.vouchers || []);
      } catch (err) {
        console.error("Errore caricamento storico:", err);
        setUsedVouchers([]);
      } finally {
        setLoading(false);
      }
    }

    loadUsedVouchers();
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-xs text-tesla-steel hover:text-tesla-onyx flex items-center gap-1 font-medium mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Torna alla Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-tesla-onyx tracking-tight">
            Storico Film & Biglietti Usati
          </h1>
          <p className="text-xs text-tesla-steel mt-0.5">
            Archivio di tutte le visioni cinematografiche con locandine ufficiali e voucher The Space associati
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded bg-white border border-tesla-border text-tesla-onyx">
            Totale: {usedVouchers.length} film
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-tesla-steel">
          Caricamento catalogo film da Supabase...
        </div>
      ) : usedVouchers.length === 0 ? (
        <div className="card-tesla-container p-12 bg-white text-center">
          <Film className="w-10 h-10 text-tesla-gray mx-auto mb-3" />
          <h3 className="text-sm font-bold text-tesla-onyx">Nessun film ancora registrato</h3>
          <p className="text-xs text-tesla-steel mt-1 max-w-sm mx-auto">
            Quando un voucher viene contrassegnato come usato con il titolo del film visto, la locandina e i dettagli vengono archiviati in questo catalogo.
          </p>
          <Link
            href="/"
            className="btn-tesla-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold mt-4 shadow-sm"
          >
            Vai alla Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {usedVouchers.map((voucher) => (
            <div
              key={voucher.id}
              className="card-tesla-container p-5 flex flex-col justify-between bg-white hover:shadow-md transition-shadow"
            >
              <div>
                {/* Movie Header with Poster Thumbnail */}
                <div className="flex items-start gap-4 mb-4">
                  {voucher.movie_poster_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={voucher.movie_poster_url}
                      alt={voucher.movie_title || "Locandina"}
                      className="w-20 h-28 object-cover rounded-md border border-slate-200 shadow-sm shrink-0 bg-slate-100"
                    />
                  ) : (
                    <div className="w-20 h-28 rounded-md bg-slate-100 border border-slate-200 shrink-0 flex flex-col items-center justify-center text-slate-400 gap-1">
                      <Film className="w-6 h-6" />
                      <span className="text-[9px] uppercase font-bold">No Cover</span>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-tesla-off-white text-tesla-onyx border border-tesla-border inline-flex items-center gap-1 mb-2">
                      <Calendar className="w-3 h-3 text-tesla-steel" />
                      {voucher.viewing_date ? formatItalianDate(voucher.viewing_date) : "Data non indicata"}
                    </span>

                    <h3 className="text-base font-bold text-tesla-onyx leading-snug line-clamp-2">
                      {voucher.movie_title || "Visione al Cinema"}
                    </h3>

                    <span className="text-xs text-tesla-steel font-medium mt-1 block">
                      The Space Cinema
                    </span>
                  </div>
                </div>

                {/* Voucher Meta details */}
                <div className="p-3 bg-tesla-off-white border border-tesla-border rounded text-xs space-y-1">
                  <div className="flex justify-between text-tesla-steel">
                    <span>Voucher Riscatto:</span>
                    <span className="font-mono font-bold text-tesla-onyx">{voucher.code}</span>
                  </div>
                  <div className="flex justify-between text-tesla-steel">
                    <span>PIN utilizzato:</span>
                    <span className="font-mono font-medium text-tesla-onyx">{voucher.pin}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-tesla-border flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedVoucherForPdf(voucher)}
                  className="btn-tesla-secondary px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-tesla-steel" />
                  Vedi Voucher PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PdfViewerModal
        voucher={selectedVoucherForPdf}
        isOpen={Boolean(selectedVoucherForPdf)}
        onClose={() => setSelectedVoucherForPdf(null)}
      />
    </main>
  );
}
