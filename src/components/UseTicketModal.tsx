"use client";

import { useState, useEffect, useRef } from "react";
import { Voucher } from "@/types";
import { X, Film, Check, Search, Image as ImageIcon, Loader2 } from "lucide-react";

interface MovieSuggestion {
  title: string;
  year?: string;
  poster?: string | null;
  source: string;
}

interface UseTicketModalProps {
  voucher: Voucher | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    voucherId: string,
    movieTitle: string,
    viewingDate: string,
    moviePosterUrl?: string | null
  ) => Promise<void>;
}

export default function UseTicketModal({
  voucher,
  isOpen,
  onClose,
  onConfirm,
}: UseTicketModalProps) {
  const [movieTitle, setMovieTitle] = useState("");
  const [viewingDate, setViewingDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Debounced search for movie titles and posters
  useEffect(() => {
    if (!movieTitle || movieTitle.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/movies/search?q=${encodeURIComponent(movieTitle.trim())}`
        );
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          setSuggestions(data.results);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      } catch (err) {
        console.warn("Autocomplete error:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [movieTitle]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen || !voucher) return null;

  const handleSelectSuggestion = (suggestion: MovieSuggestion) => {
    setMovieTitle(suggestion.title);
    if (suggestion.poster) {
      setSelectedPoster(suggestion.poster);
    }
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieTitle.trim()) {
      setError("Inserisci il titolo del film.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onConfirm(voucher.id, movieTitle.trim(), viewingDate, selectedPoster);
      setMovieTitle("");
      setSelectedPoster(null);
      onClose();
    } catch (err: any) {
      setError(err.message || "Errore durante il salvataggio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl border border-tesla-border relative animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#eeeeee]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-tesla-onyx text-white flex items-center justify-center">
              <Film className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-tesla-onyx">Registra Utilizzo Biglietto</h3>
          </div>
          <button
            onClick={onClose}
            className="text-tesla-gray hover:text-tesla-onyx text-lg leading-none p-1 rounded hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          {error && (
            <div className="p-2.5 rounded text-xs bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-tesla-steel mb-1">
              Codice Voucher da Riscattare
            </label>
            <input
              type="text"
              readOnly
              value={`${voucher.code}  (PIN: ${voucher.pin})`}
              className="w-full p-2 font-mono text-sm bg-tesla-off-white border border-tesla-border rounded text-tesla-onyx font-bold cursor-not-allowed"
            />
          </div>

          {/* Film Title with Autocomplete */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-tesla-steel mb-1">
              Titolo del Film *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                placeholder="Digita per cercare... (es. Dune, Il Gladiatore, Inception)"
                value={movieTitle}
                onChange={(e) => setMovieTitle(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowDropdown(true);
                }}
                className="w-full pl-3 pr-8 py-2 text-sm border border-tesla-border rounded outline-none focus:border-tesla-blue focus:ring-1 focus:ring-tesla-blue transition-all"
              />
              <div className="absolute right-2.5 top-2.5 text-tesla-gray">
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin text-tesla-blue" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </div>
            </div>

            {/* Suggestions Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-tesla-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-[#eeeeee]">
                {suggestions.map((item, idx) => (
                  <button
                    key={`${item.title}-${idx}`}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full p-2.5 text-left hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    {item.poster ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.poster}
                        alt={item.title}
                        className="w-8 h-12 object-cover rounded bg-slate-100 shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="w-8 h-12 rounded bg-slate-100 shrink-0 flex items-center justify-center text-slate-400 border border-slate-200">
                        <Film className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-tesla-onyx block truncate">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-tesla-steel">
                        {item.year || "Cinema"} &bull; Locandina disponibile
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Movie Poster Preview Badge */}
          {selectedPoster && (
            <div className="p-2.5 bg-tesla-off-white border border-tesla-border rounded flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedPoster}
                  alt="Locandina"
                  className="w-9 h-13 object-cover rounded border border-slate-200 shadow-sm"
                />
                <div>
                  <span className="text-xs font-semibold text-tesla-onyx block leading-tight">
                    Copertina film associata
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">
                    &check; Verrà salvata su Supabase
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPoster(null)}
                className="text-xs text-tesla-steel hover:text-red-600 p-1"
                title="Rimuovi locandina"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Viewing Date */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-tesla-steel mb-1">
              Data di Visione
            </label>
            <input
              type="date"
              value={viewingDate}
              onChange={(e) => setViewingDate(e.target.value)}
              className="w-full p-2 text-sm border border-tesla-border rounded outline-none focus:border-tesla-blue focus:ring-1 focus:ring-tesla-blue transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#eeeeee]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-tesla-secondary px-4 py-2 text-xs font-medium"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-tesla-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvataggio...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" /> Conferma come Usato
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
