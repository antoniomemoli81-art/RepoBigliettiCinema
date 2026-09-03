"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Voucher } from "@/types";
import TicketCard from "@/components/TicketCard";
import UseTicketModal from "@/components/UseTicketModal";
import PdfViewerModal from "@/components/PdfViewerModal";
import { isExpiringSoon, isExpired, formatItalianDate } from "@/lib/pdf-parser";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutGrid,
  List,
  Search,
  Plus,
  Ticket,
  AlertCircle,
  Cloud,
  CloudOff,
} from "lucide-react";

const INITIAL_SAMPLE_VOUCHERS: Voucher[] = [
  {
    id: "sample-1",
    user_id: "demo-user",
    code: "MR010739872",
    pin: "9118",
    expiration_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    circuit: "The Space Cinema",
    beneficiary: "Antonio Memoli",
    sf_code: "CB4C577A9EE2CC0D",
    pdf_filename: "voucher_MR010739872.pdf",
    is_used: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-2",
    user_id: "demo-user",
    code: "MR010739873",
    pin: "4821",
    expiration_date: "2026-12-07",
    circuit: "The Space Cinema",
    beneficiary: "Antonio Memoli",
    sf_code: "CB4C577A9EE2CC0D",
    pdf_filename: "voucher_MR010739873.pdf",
    is_used: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-3",
    user_id: "demo-user",
    code: "MR010739874",
    pin: "5532",
    expiration_date: "2026-12-07",
    circuit: "The Space Cinema",
    beneficiary: "Antonio Memoli",
    sf_code: "CB4C577A9EE2CC0D",
    pdf_filename: "voucher_MR010739874.pdf",
    is_used: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-4",
    user_id: "demo-user",
    code: "MR009841201",
    pin: "1190",
    expiration_date: "2026-12-07",
    circuit: "The Space Cinema",
    beneficiary: "Antonio Memoli",
    sf_code: "CB4C577A9EE2CC0D",
    pdf_filename: "voucher_MR009841201.pdf",
    is_used: true,
    used_at: "2026-08-24T20:30:00Z",
    movie_title: "Dune - Parte Due",
    viewing_date: "2026-08-24",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function DashboardPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "available" | "expiring" | "used">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Modals state
  const [selectedVoucherForUse, setSelectedVoucherForUse] = useState<Voucher | null>(null);
  const [selectedVoucherForPdf, setSelectedVoucherForPdf] = useState<Voucher | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Load vouchers from Supabase (if logged in) or fallback to local
  useEffect(() => {
    async function loadVouchers() {
      setLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setIsCloudSynced(true);
          const { data, error } = await supabase
            .from("vouchers")
            .select("*")
            .order("expiration_date", { ascending: true });

          if (!error && data && data.length > 0) {
            setVouchers(data as Voucher[]);
            setLoading(false);
            return;
          }
        } else {
          setIsCloudSynced(false);
        }

        // Check localStorage
        const localStored = localStorage.getItem("cinepass_vouchers");
        if (localStored) {
          setVouchers(JSON.parse(localStored));
        } else {
          setVouchers(INITIAL_SAMPLE_VOUCHERS);
          localStorage.setItem("cinepass_vouchers", JSON.stringify(INITIAL_SAMPLE_VOUCHERS));
        }
      } catch {
        const localStored = localStorage.getItem("cinepass_vouchers");
        if (localStored) {
          setVouchers(JSON.parse(localStored));
        } else {
          setVouchers(INITIAL_SAMPLE_VOUCHERS);
        }
      } finally {
        setLoading(false);
      }
    }

    loadVouchers();
  }, []);

  const syncVouchers = (updatedList: Voucher[]) => {
    setVouchers(updatedList);
    try {
      localStorage.setItem("cinepass_vouchers", JSON.stringify(updatedList));
    } catch {}
  };

  // KPIs calculation
  const stats = useMemo(() => {
    const available = vouchers.filter((v) => !v.is_used);
    const expiringSoon = available.filter((v) => isExpiringSoon(v.expiration_date, 30));
    const used = vouchers.filter((v) => v.is_used);

    return {
      availableCount: available.length,
      expiringCount: expiringSoon.length,
      usedCount: used.length,
      totalCount: vouchers.length,
    };
  }, [vouchers]);

  // Filter & search
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((voucher) => {
      if (filter === "available" && voucher.is_used) return false;
      if (filter === "expiring" && (voucher.is_used || !isExpiringSoon(voucher.expiration_date, 30)))
        return false;
      if (filter === "used" && !voucher.is_used) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = voucher.code.toLowerCase().includes(q);
        const matchesPin = voucher.pin.toLowerCase().includes(q);
        const matchesMovie = voucher.movie_title?.toLowerCase().includes(q) ?? false;
        return matchesCode || matchesPin || matchesMovie;
      }

      return true;
    });
  }, [vouchers, filter, searchQuery]);

  // Confirm ticket usage
  const handleConfirmUse = async (voucherId: string, movieTitle: string, viewingDate: string) => {
    try {
      const supabase = createClient();
      await supabase
        .from("vouchers")
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
          movie_title: movieTitle,
          viewing_date: viewingDate,
        })
        .eq("id", voucherId);
    } catch {}

    const updated = vouchers.map((v) =>
      v.id === voucherId
        ? {
            ...v,
            is_used: true,
            used_at: new Date().toISOString(),
            movie_title: movieTitle,
            viewing_date: viewingDate,
          }
        : v
    );
    syncVouchers(updated);
  };

  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 1500);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
      {/* Cloud Sync Status Banner (if not logged in) */}
      {!isCloudSynced && (
        <div className="mb-6 p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-blue-900">
            <Cloud className="w-4 h-4 text-tesla-blue shrink-0" />
            <span>
              <strong>Database Supabase collegato!</strong> Effettua l&apos;accesso per sincronizzare i tuoi voucher sul cloud Postgres e consultarli da qualunque dispositivo.
            </span>
          </div>
          <Link
            href="/login"
            className="btn-tesla-primary px-3 py-1.5 text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
          >
            Accedi / Registrati
          </Link>
        </div>
      )}

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="card-tesla-container p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-tesla-steel">
              Disponibili da Riscatto
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-tesla-onyx">{stats.availableCount}</span>
            <span className="text-xs text-tesla-steel">ingressi pronti all&apos;uso</span>
          </div>
          <div className="mt-3.5 w-full bg-[#eeeeee] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{
                width: stats.totalCount > 0 ? `${(stats.availableCount / stats.totalCount) * 100}%` : "0%",
              }}
            ></div>
          </div>
        </div>

        <div className="card-tesla-container p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-tesla-steel">
              In Scadenza (&le; 30 gg)
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full bg-amber-500 ${
                stats.expiringCount > 0 ? "animate-pulse" : ""
              }`}
            ></span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#b76e00]">{stats.expiringCount}</span>
            <span className="text-xs text-tesla-steel">voucher da usare subito</span>
          </div>
          <p className="text-xs text-tesla-steel mt-3.5 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            {stats.expiringCount > 0
              ? "Attenzione: spendi prima i voucher evidenziati in giallo"
              : "Nessun voucher in scadenza imminente"}
          </p>
        </div>

        <div className="card-tesla-container p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-tesla-steel">
              Film Visti / Usati
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-tesla-onyx">{stats.usedCount}</span>
            <span className="text-xs text-tesla-steel">visioni registrate</span>
          </div>
          <Link
            href="/history"
            className="text-xs text-tesla-blue hover:underline mt-3.5 inline-block font-medium"
          >
            Apri catalogo storico film &rarr;
          </Link>
        </div>
      </div>

      {/* Control Bar: Filters, Search, and View Switcher */}
      <div className="bg-white border border-tesla-border rounded-t-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-tesla-off-white p-1 rounded-md text-xs font-medium w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded transition-all ${
              filter === "all"
                ? "bg-white text-tesla-onyx shadow-sm font-semibold"
                : "text-tesla-steel hover:text-tesla-onyx"
            }`}
          >
            Tutti ({stats.totalCount})
          </button>
          <button
            onClick={() => setFilter("available")}
            className={`px-3 py-1.5 rounded transition-all ${
              filter === "available"
                ? "bg-white text-tesla-onyx shadow-sm font-semibold"
                : "text-tesla-steel hover:text-tesla-onyx"
            }`}
          >
            Disponibili ({stats.availableCount})
          </button>
          <button
            onClick={() => setFilter("expiring")}
            className={`px-3 py-1.5 rounded transition-all ${
              filter === "expiring"
                ? "bg-white text-tesla-onyx shadow-sm font-semibold"
                : "text-tesla-steel hover:text-tesla-onyx"
            }`}
          >
            In scadenza ({stats.expiringCount})
          </button>
          <button
            onClick={() => setFilter("used")}
            className={`px-3 py-1.5 rounded transition-all ${
              filter === "used"
                ? "bg-white text-tesla-onyx shadow-sm font-semibold"
                : "text-tesla-steel hover:text-tesla-onyx"
            }`}
          >
            Usati ({stats.usedCount})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-tesla-gray absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cerca per codice o film..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-tesla-off-white border border-transparent focus:border-tesla-blue focus:bg-white rounded outline-none transition-all"
            />
          </div>

          <div className="flex items-center border border-tesla-border rounded overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${
                viewMode === "grid"
                  ? "bg-tesla-off-white text-tesla-onyx"
                  : "text-tesla-gray hover:text-tesla-onyx"
              }`}
              title="Vista Griglia"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 transition-colors ${
                viewMode === "table"
                  ? "bg-tesla-off-white text-tesla-onyx"
                  : "text-tesla-gray hover:text-tesla-onyx"
              }`}
              title="Vista Tabella"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-20 text-center text-xs text-tesla-steel">
          Caricamento voucher in corso...
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="bg-white border border-t-0 border-tesla-border rounded-b-lg p-12 text-center">
          <Ticket className="w-10 h-10 text-tesla-gray mx-auto mb-3" />
          <h3 className="text-sm font-bold text-tesla-onyx">Nessun voucher trovato</h3>
          <p className="text-xs text-tesla-steel mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "Nessun risultato per la ricerca inserita. Prova con un codice differente."
              : "Non hai ancora caricato nessun carnet di biglietti in questa sezione."}
          </p>
          <Link
            href="/import"
            className="btn-tesla-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold mt-4 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Importa il tuo primo Carnet (PDF / ZIP)
          </Link>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-5">
          {filteredVouchers.map((voucher) => (
            <TicketCard
              key={voucher.id}
              voucher={voucher}
              onUse={(v) => setSelectedVoucherForUse(v)}
              onViewPdf={(v) => setSelectedVoucherForPdf(v)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-tesla-border rounded-b-lg overflow-hidden shadow-sm mt-0 border-t-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tesla-off-white border-b border-tesla-border text-tesla-steel uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3.5">Stato</th>
                  <th className="p-3.5">Codice Biglietto</th>
                  <th className="p-3.5">PIN</th>
                  <th className="p-3.5">Scadenza</th>
                  <th className="p-3.5">Film Associato</th>
                  <th className="p-3.5 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeeeee]">
                {filteredVouchers.map((v) => {
                  const expiring = !v.is_used && isExpiringSoon(v.expiration_date, 30);
                  const expired = !v.is_used && isExpired(v.expiration_date);

                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-[#fafafa] transition-colors ${
                        v.is_used ? "bg-[#fafafa]/50" : ""
                      }`}
                    >
                      <td className="p-3.5">
                        {v.is_used ? (
                          <span className="badge-status-used text-[11px] font-semibold px-2 py-0.5 rounded-full">
                            Usato
                          </span>
                        ) : expired ? (
                          <span className="bg-red-50 text-red-700 border border-red-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                            Scaduto
                          </span>
                        ) : expiring ? (
                          <span className="badge-status-expiring text-[11px] font-semibold px-2 py-0.5 rounded-full">
                            In scadenza
                          </span>
                        ) : (
                          <span className="badge-status-available text-[11px] font-semibold px-2 py-0.5 rounded-full">
                            Disponibile
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-tesla-onyx">
                        <span className={v.is_used ? "line-through text-tesla-steel" : ""}>
                          {v.code}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-tesla-onyx">
                        <span className={v.is_used ? "text-tesla-steel" : ""}>{v.pin}</span>
                      </td>
                      <td
                        className={`p-3.5 font-medium ${
                          expiring ? "text-amber-700 font-semibold" : "text-tesla-steel"
                        }`}
                      >
                        {formatItalianDate(v.expiration_date)}
                      </td>
                      <td className="p-3.5">
                        {v.is_used && v.movie_title ? (
                          <span className="font-semibold text-tesla-onyx">
                            {v.movie_title}{" "}
                            {v.viewing_date && (
                              <span className="font-normal text-tesla-steel text-[11px]">
                                ({formatItalianDate(v.viewing_date)})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-tesla-gray">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        {!v.is_used && (
                          <>
                            <button
                              onClick={() => handleCopyCode(v.id, v.code)}
                              className="btn-tesla-secondary px-2.5 py-1 text-xs text-tesla-blue"
                            >
                              {copiedCodeId === v.id ? "Copiato!" : "Copia Codice"}
                            </button>
                            <button
                              onClick={() => setSelectedVoucherForUse(v)}
                              className="btn-tesla-primary px-3 py-1 text-xs font-semibold"
                            >
                              Usa
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setSelectedVoucherForPdf(v)}
                          className="btn-tesla-secondary px-2 py-1 text-xs"
                          title="Visualizza PDF originale"
                        >
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <UseTicketModal
        voucher={selectedVoucherForUse}
        isOpen={Boolean(selectedVoucherForUse)}
        onClose={() => setSelectedVoucherForUse(null)}
        onConfirm={handleConfirmUse}
      />

      <PdfViewerModal
        voucher={selectedVoucherForPdf}
        isOpen={Boolean(selectedVoucherForPdf)}
        onClose={() => setSelectedVoucherForPdf(null)}
      />
    </main>
  );
}
