"use client";

import { useState } from "react";
import { Voucher } from "@/types";
import { X, Film, Calendar, Check } from "lucide-react";

interface UseTicketModalProps {
  voucher: Voucher | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (voucherId: string, movieTitle: string, viewingDate: string) => Promise<void>;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !voucher) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieTitle.trim()) {
      setError("Inserisci il titolo del film");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onConfirm(voucher.id, movieTitle.trim(), viewingDate);
      setMovieTitle("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Errore durante il salvataggio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
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
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${voucher.code}  (PIN: ${voucher.pin})`}
                className="w-full p-2 font-mono text-sm bg-tesla-off-white border border-tesla-border rounded text-tesla-onyx font-bold cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-tesla-steel mb-1">
              Titolo del Film *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Es. Dune: Parte Due, Oppenheimer, Spider-Man..."
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              className="w-full p-2 text-sm border border-tesla-border rounded outline-none focus:border-tesla-blue focus:ring-1 focus:ring-tesla-blue transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-tesla-steel mb-1">
              Data di Visione
            </label>
            <div className="relative">
              <input
                type="date"
                value={viewingDate}
                onChange={(e) => setViewingDate(e.target.value)}
                className="w-full p-2 text-sm border border-tesla-border rounded outline-none focus:border-tesla-blue focus:ring-1 focus:ring-tesla-blue transition-all"
              />
            </div>
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
                "Salvataggio in corso..."
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
