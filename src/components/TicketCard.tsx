"use client";

import { useState } from "react";
import { Voucher } from "@/types";
import { isExpiringSoon, isExpired, formatItalianDate } from "@/lib/pdf-parser";
import { Copy, Check, FileText, CheckCircle2, Film, Clock } from "lucide-react";

interface TicketCardProps {
  voucher: Voucher;
  onUse: (voucher: Voucher) => void;
  onViewPdf: (voucher: Voucher) => void;
}

export default function TicketCard({ voucher, onUse, onViewPdf }: TicketCardProps) {
  const [copiedField, setCopiedField] = useState<"code" | "pin" | null>(null);

  const copyToClipboard = (text: string, field: "code" | "pin") => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const expiring = !voucher.is_used && isExpiringSoon(voucher.expiration_date, 30);
  const expired = !voucher.is_used && isExpired(voucher.expiration_date);

  // Calculate days remaining
  let daysRemaining = 0;
  if (voucher.expiration_date) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const exp = new Date(voucher.expiration_date);
    exp.setHours(0, 0, 0, 0);
    daysRemaining = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div
      className={`card-tesla-container p-5 flex flex-col justify-between relative ${
        voucher.is_used
          ? "border-l-4 border-l-slate-300 bg-[#fafafa]/80 opacity-90"
          : expired
          ? "border-l-4 border-l-red-500"
          : expiring
          ? "border-l-4 border-l-amber-500"
          : "border-l-4 border-l-emerald-500"
      }`}
    >
      <div>
        {/* Top Status & Expiration Header */}
        <div className="flex items-center justify-between mb-3.5">
          {voucher.is_used ? (
            <span className="badge-status-used text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-slate-500" />
              Usato
            </span>
          ) : expired ? (
            <span className="bg-red-50 text-red-700 border border-red-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-red-600" />
              Scaduto
            </span>
          ) : expiring ? (
            <span className="badge-status-expiring text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Scade tra {daysRemaining} gg
            </span>
          ) : (
            <span className="badge-status-available text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Disponibile
            </span>
          )}

          <span className="text-xs text-tesla-steel">
            {voucher.is_used ? "Visto:" : "Scadenza:"}{" "}
            <strong className="text-tesla-onyx font-medium">
              {voucher.is_used && voucher.viewing_date
                ? formatItalianDate(voucher.viewing_date)
                : formatItalianDate(voucher.expiration_date)}
            </strong>
          </span>
        </div>

        {/* Voucher Code & PIN Block */}
        <div className="bg-[#f8f9fa] border border-[#e9ecef] rounded p-3 mb-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-tesla-steel">
              Codice Biglietto
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-sm font-bold select-all ${
                  voucher.is_used ? "line-through text-tesla-steel" : "text-tesla-onyx"
                }`}
              >
                {voucher.code}
              </span>
              {!voucher.is_used && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(voucher.code, "code")}
                  className={`px-2 py-0.5 text-xs rounded font-medium border transition-colors flex items-center gap-1 ${
                    copiedField === "code"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-white text-tesla-blue border-tesla-border hover:bg-slate-50"
                  }`}
                  title="Copia codice negli appunti"
                >
                  {copiedField === "code" ? (
                    <>
                      <Check className="w-2.5 h-2.5" /> Copiato
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" /> Copia
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#e9ecef] pt-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-tesla-steel">
              PIN
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-sm font-bold tracking-wider select-all ${
                  voucher.is_used ? "text-tesla-steel" : "text-tesla-onyx"
                }`}
              >
                {voucher.pin}
              </span>
              {!voucher.is_used && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(voucher.pin, "pin")}
                  className={`px-2 py-0.5 text-xs rounded font-medium border transition-colors flex items-center gap-1 ${
                    copiedField === "pin"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-white text-tesla-blue border-tesla-border hover:bg-slate-50"
                  }`}
                  title="Copia PIN negli appunti"
                >
                  {copiedField === "pin" ? (
                    <>
                      <Check className="w-2.5 h-2.5" /> Copiato
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" /> Copia
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Used Film details (if already used) */}
        {voucher.is_used && voucher.movie_title && (
          <div className="bg-white border border-[#e9ecef] rounded p-2.5 mb-4 flex items-start gap-2">
            <Film className="w-4 h-4 text-tesla-steel shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] text-tesla-steel uppercase tracking-wider block font-medium">
                Film visto al cinema:
              </span>
              <span className="text-xs font-bold text-tesla-onyx truncate block">
                {voucher.movie_title}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-tesla-border/50">
        {!voucher.is_used ? (
          <button
            type="button"
            onClick={() => onUse(voucher)}
            className="btn-tesla-primary flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            Usa Biglietto
          </button>
        ) : (
          <span className="text-xs text-tesla-steel font-medium flex-1">
            Utilizzato per la visione
          </span>
        )}

        <button
          type="button"
          onClick={() => onViewPdf(voucher)}
          className="btn-tesla-secondary px-3 py-2 text-xs font-medium flex items-center gap-1.5"
          title="Visualizza voucher PDF originale"
        >
          <FileText className="w-3.5 h-3.5 text-tesla-steel" />
          <span className="hidden sm:inline">PDF</span>
        </button>
      </div>
    </div>
  );
}
