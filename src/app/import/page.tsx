"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ParsedTicket } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { storePdfBlob } from "@/lib/pdf-storage";
import {
  UploadCloud,
  FileCheck2,
  FileWarning,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  AlertCircle,
  FileUp,
  Loader2,
} from "lucide-react";

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [extractedTickets, setExtractedTickets] = useState<ParsedTicket[]>([]);

  // Trigger file dialog
  const handleSelectFilesClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle files (both from input and drag & drop)
  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(
      (f) =>
        f.name.toLowerCase().endsWith(".pdf") ||
        f.name.toLowerCase().endsWith(".zip") ||
        f.type === "application/pdf" ||
        f.type === "application/zip"
    );

    if (fileArray.length === 0) {
      setError("Seleziona almeno un file PDF o un archivio ZIP valido.");
      return;
    }

    setError(null);
    setParsing(true);

    try {
      const formData = new FormData();
      fileArray.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/parse-carnet", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Errore durante l'elaborazione dei file.");
      }

      setExtractedTickets(data.tickets);
    } catch (err: any) {
      setError(err.message || "Impossibile elaborare i file.");
    } finally {
      setParsing(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Edit ticket field inline
  const updateTicketField = (
    id: string,
    field: "code" | "pin" | "expirationDate",
    value: string
  ) => {
    setExtractedTickets((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, [field]: value };
          updated.isValid = Boolean(
            updated.code && updated.pin && updated.expirationDate
          );
          return updated;
        }
        return t;
      })
    );
  };

  // Remove ticket from list
  const removeTicket = (id: string) => {
    setExtractedTickets((prev) => prev.filter((t) => t.id !== id));
  };

  // Save all confirmed tickets to DB, IndexedDB & Supabase Storage
  const handleSaveAll = async () => {
    if (extractedTickets.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const batchId = crypto.randomUUID();
      const newVouchers = [];

      for (const t of extractedTickets) {
        const voucherId = crypto.randomUUID();
        let storagePath = null;

        // Save PDF file binary into IndexedDB for instant local viewing
        if (t.pdfBase64) {
          try {
            const byteCharacters = atob(t.pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const pdfBlob = new Blob([byteArray], { type: "application/pdf" });

            // Store by ID and by code
            await storePdfBlob(voucherId, pdfBlob);
            await storePdfBlob(t.code, pdfBlob);

            // If Supabase user is logged in, upload to Supabase Storage
            if (user?.id) {
              const filePath = `${user.id}/${t.code}.pdf`;
              const { data: uploadData } = await supabase.storage
                .from("vouchers")
                .upload(filePath, pdfBlob, { upsert: true });
              if (uploadData) {
                storagePath = filePath;
              }
            }
          } catch (err) {
            console.warn("Could not save PDF to storage:", err);
          }
        }

        newVouchers.push({
          id: voucherId,
          user_id: user?.id || "demo-user",
          code: t.code,
          pin: t.pin,
          expiration_date: t.expirationDate || "2026-12-07",
          circuit: t.circuit || "The Space Cinema",
          sf_code: t.sfCode || null,
          beneficiary: t.beneficiary || null,
          pdf_filename: t.filename,
          pdf_storage_path: storagePath,
          is_used: false,
          batch_id: batchId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Try inserting into Supabase
      try {
        await supabase.from("vouchers").insert(newVouchers);
      } catch {}

      // In local mode / demo fallback: sync with localStorage
      const localStored = localStorage.getItem("cinepass_vouchers");
      const currentList = localStored ? JSON.parse(localStored) : [];
      const updatedList = [...newVouchers, ...currentList];
      localStorage.setItem("cinepass_vouchers", JSON.stringify(updatedList));

      setSuccessMessage(
        `${newVouchers.length} biglietti e i rispettivi file PDF originali sono stati salvati con successo nel Vault!`
      );

      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Errore durante il salvataggio dei voucher.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs text-tesla-steel hover:text-tesla-onyx flex items-center gap-1 font-medium mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-tesla-onyx tracking-tight">
            Importazione Biglietti e Carnet
          </h1>
          <p className="text-xs text-tesla-steel mt-0.5">
            Carica più PDF contemporaneamente o un file ZIP contenente i voucher
            The Space Cinema
          </p>
        </div>

        {extractedTickets.length > 0 && (
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="btn-tesla-primary px-5 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Salvataggio in
                corso...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Salva tutti i{" "}
                {extractedTickets.length} Voucher
              </>
            )}
          </button>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-6 p-4 rounded bg-red-50 text-red-700 border border-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.zip,application/pdf,application/zip"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
          }
        }}
        className="hidden"
      />

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleSelectFilesClick}
        className={`card-tesla-container p-10 bg-white border-2 border-dashed transition-all cursor-pointer text-center mb-8 ${
          isDragging
            ? "border-tesla-blue bg-blue-50/20 shadow-md"
            : "border-tesla-border-dark hover:border-tesla-blue hover:bg-[#fbfbfb]"
        }`}
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-tesla-off-white flex items-center justify-center text-tesla-steel group-hover:text-tesla-blue transition-colors">
          {parsing ? (
            <Loader2 className="w-7 h-7 animate-spin text-tesla-blue" />
          ) : (
            <UploadCloud className="w-7 h-7 text-tesla-blue" />
          )}
        </div>

        <h3 className="text-base font-semibold text-tesla-onyx">
          {parsing
            ? "Analisi ed estrazione automatica dei voucher in corso..."
            : "Trascina qui i tuoi PDF singoli o il file ZIP del carnet"}
        </h3>
        <p className="text-xs text-tesla-steel mt-1 max-w-md mx-auto">
          Il parser rileverà automaticamente Codice Biglietto, PIN e Data di
          Scadenza per ogni biglietto e memorizzerà il PDF originale.
        </p>

        <div className="mt-4">
          <button
            type="button"
            className="btn-tesla-primary px-4 py-2 text-xs font-semibold shadow-sm"
          >
            Seleziona file dal dispositivo
          </button>
        </div>

        <p className="text-[11px] text-tesla-gray mt-3">
          Supporta: file .pdf multipli, cartelle compresse .zip
        </p>
      </div>

      {/* Extracted Tickets Review Table */}
      {extractedTickets.length > 0 && (
        <div className="card-tesla-container p-6 bg-white shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-tesla-border">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-tesla-onyx">
                  Voucher Rilevati ({extractedTickets.length})
                </h2>
                <span className="badge-status-available text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  Verifica e Conferma
                </span>
              </div>
              <p className="text-xs text-tesla-steel mt-0.5">
                Puoi modificare i campi inline in caso di incongruenze prima del
                salvataggio.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setExtractedTickets([]);
              }}
              className="text-xs text-tesla-steel hover:text-red-600 transition-colors"
            >
              Rimuovi tutti
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tesla-off-white border-b border-tesla-border text-tesla-steel uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3">File</th>
                  <th className="p-3">Codice Biglietto</th>
                  <th className="p-3">PIN</th>
                  <th className="p-3">Scadenza</th>
                  <th className="p-3">Stato</th>
                  <th className="p-3 text-right">Rimuovi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeeeee]">
                {extractedTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-[#fafafa]">
                    <td className="p-3 font-mono text-tesla-steel text-[11px] max-w-[180px] truncate">
                      {ticket.filename}
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={ticket.code}
                        onChange={(e) =>
                          updateTicketField(ticket.id, "code", e.target.value)
                        }
                        className="p-1.5 font-mono text-xs font-bold text-tesla-onyx border border-tesla-border rounded w-36 outline-none focus:border-tesla-blue focus:ring-1 focus:ring-tesla-blue"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={ticket.pin}
                        onChange={(e) =>
                          updateTicketField(ticket.id, "pin", e.target.value)
                        }
                        className="p-1.5 font-mono text-xs font-bold text-tesla-onyx border border-tesla-border rounded w-20 outline-none focus:border-tesla-blue focus:ring-1 focus:ring-tesla-blue"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="date"
                        value={ticket.expirationDate}
                        onChange={(e) =>
                          updateTicketField(
                            ticket.id,
                            "expirationDate",
                            e.target.value
                          )
                        }
                        className="p-1.5 text-xs text-tesla-onyx border border-tesla-border rounded outline-none focus:border-tesla-blue focus:ring-1 focus:ring-tesla-blue"
                      />
                    </td>
                    <td className="p-3">
                      {ticket.isValid ? (
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <FileCheck2 className="w-3.5 h-3.5" /> Valido
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium flex items-center gap-1">
                          <FileWarning className="w-3.5 h-3.5" /> Da completare
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => removeTicket(ticket.id)}
                        className="text-tesla-gray hover:text-red-600 p-1"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-tesla-border">
            <Link
              href="/"
              className="btn-tesla-secondary px-4 py-2 text-xs font-medium"
            >
              Annulla
            </Link>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="btn-tesla-primary px-5 py-2 text-xs font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Salvataggio in
                  corso...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Conferma e Salva nel
                  Vault
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
