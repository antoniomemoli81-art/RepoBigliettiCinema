"use client";

import { useEffect, useState } from "react";
import { Voucher } from "@/types";
import { getPdfBlob } from "@/lib/pdf-storage";
import { createClient } from "@/lib/supabase/client";
import { X, Download, ExternalLink, Loader2, FileText, AlertCircle } from "lucide-react";

interface PdfViewerModalProps {
  voucher: Voucher | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PdfViewerModal({ voucher, isOpen, onClose }: PdfViewerModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activeUrl: string | null = null;

    async function loadPdf() {
      if (!voucher || !isOpen) {
        setPdfUrl(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Check IndexedDB for the local binary file
        let blob = await getPdfBlob(voucher.id);
        if (!blob && voucher.code) {
          blob = await getPdfBlob(voucher.code);
        }

        if (blob) {
          activeUrl = URL.createObjectURL(blob);
          setPdfUrl(activeUrl);
          setLoading(false);
          return;
        }

        // 2. Check Supabase Storage if path exists
        if (voucher.pdf_storage_path) {
          const supabase = createClient();
          const { data, error: storageError } = await supabase.storage
            .from("vouchers")
            .createSignedUrl(voucher.pdf_storage_path, 3600);

          if (data?.signedUrl) {
            setPdfUrl(data.signedUrl);
            setLoading(false);
            return;
          }
        }

        // 3. Fallback for sample tickets or if local sample available
        const sampleCheck = await fetch("/sample_voucher.pdf", { method: "HEAD" });
        if (sampleCheck.ok) {
          setPdfUrl("/sample_voucher.pdf");
          setLoading(false);
          return;
        }

        // No PDF file found
        setError(
          "File PDF originale non trovato nella memoria locale o nello storage remoto."
        );
      } catch (err: any) {
        console.error("Errore nel caricamento del file PDF:", err);
        setError("Impossibile caricare il documento PDF: " + (err.message || ""));
      } finally {
        setLoading(false);
      }
    }

    loadPdf();

    return () => {
      if (activeUrl && activeUrl.startsWith("blob:")) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [voucher, isOpen]);

  if (!isOpen || !voucher) return null;

  const filename = voucher.pdf_filename || `voucher_${voucher.code}.pdf`;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg max-w-5xl w-full h-[92vh] max-h-[900px] p-4 sm:p-6 shadow-2xl border border-tesla-border flex flex-col">
        {/* Modal Topbar */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#eeeeee]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-tesla-onyx text-white flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-tesla-onyx truncate">
                {filename}
              </h3>
              <span className="text-[11px] text-tesla-steel block truncate">
                Codice: <strong className="font-mono text-tesla-onyx">{voucher.code}</strong> &bull; PIN:{" "}
                <strong className="font-mono text-tesla-onyx">{voucher.pin}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pdfUrl && (
              <>
                <a
                  href={pdfUrl}
                  download={filename}
                  className="btn-tesla-secondary px-3 py-1.5 text-xs text-tesla-onyx font-medium flex items-center gap-1.5 hover:text-tesla-blue transition-colors"
                  title="Scarica il file PDF sul tuo dispositivo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Scarica</span>
                </a>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-tesla-secondary px-3 py-1.5 text-xs text-tesla-onyx font-medium flex items-center gap-1.5 hover:text-tesla-blue transition-colors"
                  title="Apri PDF a schermo intero in una nuova scheda"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nuova scheda</span>
                </a>
              </>
            )}
            <button
              onClick={onClose}
              className="text-tesla-gray hover:text-tesla-onyx p-1.5 rounded hover:bg-slate-100 transition-colors ml-1"
              title="Chiudi visualizzatore"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real PDF Embedded Viewer */}
        <div className="flex-1 w-full bg-[#525659] rounded mt-3 overflow-hidden relative flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-white text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
              <span>Caricamento del file PDF originale in corso...</span>
            </div>
          ) : error ? (
            <div className="bg-white p-6 rounded-lg max-w-md text-center m-4 shadow-lg border border-red-200">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-tesla-onyx mb-1">Documento non visualizzabile</h4>
              <p className="text-xs text-tesla-steel mb-4">{error}</p>
              <p className="text-[11px] text-tesla-gray">
                Caricando il carnet dalla pagina <strong>Importa PDF / ZIP</strong> il file originale verrà archiviato e reso consultabile all&apos;istante.
              </p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0 rounded"
              title={filename}
            />
          ) : null}
        </div>

        {/* Modal Bottom Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#eeeeee] mt-3">
          <span className="text-[11px] text-tesla-steel">
            Documento originale di <strong>The Space Cinema</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-tesla-primary px-4 py-1.5 text-xs font-semibold"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
