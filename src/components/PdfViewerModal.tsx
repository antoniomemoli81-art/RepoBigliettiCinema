"use client";

import { useEffect, useState } from "react";
import { Voucher } from "@/types";
import { formatItalianDate } from "@/lib/pdf-parser";
import { createClient } from "@/lib/supabase/client";
import { X, Download, ExternalLink, Ticket, ShieldCheck } from "lucide-react";

interface PdfViewerModalProps {
  voucher: Voucher | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PdfViewerModal({ voucher, isOpen, onClose }: PdfViewerModalProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (voucher?.pdf_storage_path) {
      try {
        const supabase = createClient();
        supabase.storage
          .from("vouchers")
          .createSignedUrl(voucher.pdf_storage_path, 3600)
          .then(({ data }) => {
            if (data?.signedUrl) {
              setDownloadUrl(data.signedUrl);
            }
          });
      } catch {
        // storage client fallback
      }
    } else {
      setDownloadUrl(null);
    }
  }, [voucher]);

  if (!isOpen || !voucher) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-2xl border border-tesla-border max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#eeeeee]">
          <div>
            <h3 className="text-sm font-bold text-tesla-onyx">Visualizzatore Voucher Cinema</h3>
            <span className="text-xs text-tesla-steel font-mono">
              {voucher.pdf_filename || `voucher_${voucher.code}.pdf`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={voucher.pdf_filename || `voucher_${voucher.code}.pdf`}
                target="_blank"
                rel="noreferrer"
                className="btn-tesla-secondary px-2.5 py-1 text-xs text-tesla-blue font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Scarica PDF
              </a>
            )}
            <button
              onClick={onClose}
              className="text-tesla-gray hover:text-tesla-onyx text-xl leading-none p-1 rounded hover:bg-slate-100 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF / Voucher Digital Replica Frame */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#f0f0f2] my-4 rounded border border-tesla-border">
          <div className="max-w-md mx-auto bg-white p-7 shadow-md border border-[#d5d5d5] text-center rounded-sm">
            
            {/* The Space Cinema Header & Barcode */}
            <div className="flex justify-between items-start pb-5 border-b border-[#eeeeee]">
              <div className="text-left">
                <span className="font-extrabold text-xl tracking-wider text-black block leading-none">
                  THE SPACE
                </span>
                <span className="text-[11px] font-semibold text-[#8e8e93] tracking-widest block mt-1">
                  CINEMA
                </span>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm tracking-widest text-black select-none font-bold">
                  |||||| |||| ||||| ||||| ||
                </div>
                <span className="font-mono text-xs font-bold text-black tracking-wider block mt-0.5">
                  {voucher.code}
                </span>
              </div>
            </div>

            {/* Voucher Box */}
            <div className="border-2 border-[#ff6b00] rounded p-4 my-6 bg-orange-50/20 text-left">
              <h4 className="font-bold text-xs uppercase tracking-wider text-orange-950 text-center mb-3">
                VOUCHER INGRESSO SINGOLO VALIDO FINO AL{" "}
                <span className="underline">
                  {formatItalianDate(voucher.expiration_date)}
                </span>
              </h4>
              <div className="text-xs font-mono space-y-1.5 text-slate-900">
                <p>
                  CODICE: <strong className="font-bold text-black">{voucher.code}</strong>
                </p>
                <p>
                  PIN: <strong className="font-bold text-black tracking-wider">{voucher.pin}</strong>
                </p>
                {voucher.sf_code && <p>SF: {voucher.sf_code}</p>}
                {voucher.beneficiary && (
                  <p className="font-sans pt-1 border-t border-orange-200 mt-2">
                    BENEFICIARIO: <strong>{voucher.beneficiary}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Voucher Instructions */}
            <div className="text-[11px] text-tesla-steel text-left space-y-1.5 border-t border-[#eeeeee] pt-4">
              <p className="font-semibold text-tesla-onyx">Come utilizzare il voucher per il cinema:</p>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Accedi su App o sito thespacecinema.it.</li>
                <li>Seleziona lo spettacolo e il posto in sala.</li>
                <li>Inserisci il <strong>Codice</strong> e il <strong>PIN</strong> sopra indicati.</li>
                <li>Riceverai il biglietto per accedere saltando la fila.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#eeeeee]">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
            <span>Documento salvato nel tuo Vault protetto</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-tesla-secondary px-4 py-1.5 text-xs font-medium"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
}
