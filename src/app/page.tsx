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
  LogIn,
  Film,
  Lock,
  FileText,
} from "lucide-react";

export default function DashboardPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  const [filter, setFilter] = useState<"all" | "available" | "expiring" | "used">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [selectedVoucherForUse, setSelectedVoucherForUse] = useState<Voucher | null>(null);
  const [selectedVoucherForPdf, setSelectedVoucherForPdf] = useState<Voucher | null>(null);

  // Load vouchers directly from Supabase
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          setUser({ id: authUser.id, email: authUser.email });

          // Fetch user's vouchers from Supabase DB
          const { data, error } = await supabase
            .from("vouchers")
            .select("*")
            .order("expiration_date", { ascending: true });

          if (!error && data) {
            setVouchers(data as Voucher[]);
          } else {
            setVouchers([]);
          }
        } else {
          setUser(null);

          // Unauthenticated user: fetch ONLY USED vouchers (public view) from Supabase
          const res = await fetch("/api/vouchers/public");
          const json = await res.json();
          setVouchers(json.vouchers || []);
        }
      } catch (err) {
        console.error("Errore caricamento dati:", err);
        setVouchers([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const isAuthenticated = Boolean(user);

  // KPIs calculation
  const stats = useMemo(() => {
    if (!isAuthenticated) {
      return {
        availableCount: 0,
        expiringCount: 0,
        usedCount: vouchers.length,
        totalCount: vouchers.length,
      };
    }

    const available = vouchers.filter((v) => !v.is_used);
    const expiringSoon = available.filter((v) => isExpiringSoon(v.expiration_date, 30));
    const used = vouchers.filter((v) => v.is_used);

    return {
      availableCount: available.length,
      expiringCount: expiringSoon.length,
      usedCount: used.length,
      totalCount: vouchers.length,
    };
  }, [vouchers, isAuthenticated]);

  // Filter & search
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((voucher) => {
      // If unauthenticated: strictly allow only used vouchers
      if (!isAuthenticated && !voucher.is_used) {
        return false;
      }

      if (isAuthenticated) {
        if (filter === "available" && voucher.is_used) return false;
        if (filter === "expiring" && (voucher.is_used || !isExpiringSoon(voucher.expiration_date, 30)))
          return false;
        if (filter === "used" && !voucher.is_used) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = voucher.code.toLowerCase().includes(q);
        const matchesPin = voucher.pin.toLowerCase().includes(q);
        const matchesMovie = voucher.movie_title?.toLowerCase().includes(q) ?? false;
        return matchesCode || matchesPin || matchesMovie;
      }

      return true;
    });
  }, [vouchers, filter, searchQuery, isAuthenticated]);

  // Confirm ticket usage (authenticated only)
  const handleConfirmUse = async (
    voucherId: string,
    movieTitle: string,
    viewingDate: string,
    moviePosterUrl?: string | null
  ) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("vouchers")
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
          movie_title: movieTitle,
          viewing_date: viewingDate,
          movie_poster_url: moviePosterUrl || null,
        })
        .eq("id", voucherId);

      if (error) throw error;

      // Update state
      setVouchers((prev) =>
        prev.map((v) =>
          v.id === voucherId
            ? {
                ...v,
                is_used: true,
                used_at: new Date().toISOString(),
                movie_title: movieTitle,
                viewing_date: viewingDate,
                movie_poster_url: moviePosterUrl || null,
              }
            : v
        )
      );
    } catch (err: any) {
      alert("Errore salvataggio uso: " + (err.message || ""));
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
      {/* Banner for unauthenticated visitors */}
      {!isAuthenticated && !loading && (
        <div className="mb-8 p-5 bg-white border border-tesla-border rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded bg-tesla-off-white flex items-center justify-center text-tesla-steel shrink-0">
              <Lock className="w-5 h-5 text-tesla-onyx" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-tesla-onyx">
                Visualizzazione Pubblica &mdash; Archivio Visioni
              </h2>
              <p className="text-xs text-tesla-steel mt-0.5">
                I voucher disponibili e i dettagli privati sono protetti. Effettua l&apos;accesso per gestire i tuoi biglietti e caricare nuovi carnet.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="btn-tesla-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            Accedi al tuo Vault
          </Link>
        </div>
      )}

      {/* KPI Cards: ONLY visible if authenticated */}
      {isAuthenticated && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {/* Disponibili */}
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

          {/* In Scadenza */}
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
                ? "Priorità: spendi prima i voucher evidenziati in giallo"
                : "Nessun voucher in scadenza imminente"}
            </p>
          </div>

          {/* Film Visti */}
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
      )}

      {/* Control Bar */}
      <div className="bg-white border border-tesla-border rounded-t-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {isAuthenticated ? (
          /* Filter Pills for authenticated user */
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
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-tesla-onyx">
              Film Visti Registrati ({vouchers.length})
            </span>
          </div>
        )}

        {/* Search and Grid/Table Switcher */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-tesla-gray absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cerca film o codice..."
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

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center text-xs text-tesla-steel bg-white border border-t-0 border-tesla-border rounded-b-lg">
          Caricamento dati dal cloud Supabase...
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="bg-white border border-t-0 border-tesla-border rounded-b-lg p-12 text-center">
          <Ticket className="w-10 h-10 text-tesla-gray mx-auto mb-3" />
          <h3 className="text-sm font-bold text-tesla-onyx">Nessun voucher presente</h3>
          <p className="text-xs text-tesla-steel mt-1 max-w-sm mx-auto">
            {isAuthenticated
              ? "Non ci sono ancora voucher registrati nel tuo account Supabase."
              : "Nessun film visto registrato nell'archivio pubblico."}
          </p>
          {isAuthenticated && (
            <Link
              href="/import"
              className="btn-tesla-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold mt-4 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Carica il tuo primo Carnet (PDF / ZIP)
            </Link>
          )}
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
                {filteredVouchers.map((v) => (
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
                    <td className="p-3.5 text-tesla-steel">
                      {formatItalianDate(v.expiration_date)}
                    </td>
                    <td className="p-3.5">
                      {v.movie_title ? (
                        <div className="flex items-center gap-2.5">
                          {v.movie_poster_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={v.movie_poster_url}
                              alt={v.movie_title}
                              className="w-7 h-10 object-cover rounded border border-slate-200 shrink-0 shadow-xs"
                            />
                          ) : (
                            <div className="w-7 h-10 rounded bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400">
                              <Film className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <span className="font-semibold text-tesla-onyx">
                            {v.movie_title}{" "}
                            {v.viewing_date && (
                              <span className="font-normal text-tesla-steel text-[11px]">
                                ({formatItalianDate(v.viewing_date)})
                              </span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-tesla-gray">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      {isAuthenticated && !v.is_used && (
                        <button
                          onClick={() => setSelectedVoucherForUse(v)}
                          className="btn-tesla-primary px-3 py-1 text-xs font-semibold"
                        >
                          Usa
                        </button>
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
                ))}
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
