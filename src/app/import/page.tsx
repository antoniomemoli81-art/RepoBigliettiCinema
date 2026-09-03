"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ParsedTicket } from "@/types";
import { createClient } from "@/lib/supabase/client";
import {
  UploadCloud,
  FileCheck2,
  FileWarning,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Loader2,
  Lock,
} from "lucide-react";

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [extractedTickets, setExtractedTickets] = useState<ParsedTicket[]>([]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          setUser({ id: authUser.id, email: authUser.email });
        } else {
          setUser(null);
        }
      } catch (e) {
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  // Trigger file dialog
  const handleSelectFilesClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Process files
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

  const removeTicket = (id: string) => {
    setExtractedTickets((prev) => prev.filter((t) => t.id !== id));
  };

  // Save all confirmed tickets to Supabase DB & Supabase Storage ONLY
  const handleSaveAll = async () => {
    if (!user) {
      setError("Devi effettuare l'accesso per salvare i biglietti su Supabase.");
      return;
    }

    if (extractedTickets.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const batchId = crypto.randomUUID();
      const newVouchers = [];

      for (const t of extractedTickets) {
        const voucherId = crypto.randomUUID();
        let storagePath = null;

        // Upload PDF directly to Supabase Storage
        if (t.pdfBase64) {
          try {
            const byteCharacters = atob(t.pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const pdfBlob = new Blob([byteArray], { type: "application/pdf" });

            const filePath = `${user.id}/${t.code}.pdf`;
            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from("vouchers")
              .upload(filePath, pdfBlob, { upsert: true });

            if (uploadErr) {
              console.warn("Upload storage error:", uploadErr);
            } else if (uploadData) {
              storagePath = filePath;
            }
          } catch (storageException) {
            console.warn("Exception during Supabase storage upload:", storageException);
          }
        }

        newVouchers.push({
          id: voucherId,
          user_id: user.id,
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

      // Insert directly into Supabase PostgreSQL vouchers table
      const { error: dbError } = await supabase.from("vouchers").insert(newVouchers);
      if (dbError) throw dbError;

      setSuccessMessage(
        `${newVouchers.length} biglietti sono stati salvati con successo su Supabase!`
      );

      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Errore durante il salvataggio dei voucher su Supabase.");
    } finally {
      setSaving(false);
    }
  };

  if (checkingAuth) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-20 text-center text-xs text-tesla-steel">
        Verifica autenticazione in corso...
      </main>
    );
  }

  // If user is not logged in: block access with Tesla design card
  if (!user) {
    return (
      <main className="max-w-md mx-auto px-6 py-16 w-full flex-1 text-center">
        <div className="card-tesla-container p-8 bg-white shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-lg bg-tesla-off-white flex items-center justify-center text-tesla-onyx mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-tesla-onyx">Accesso Riservato</h2>
          <p className="text-xs text-tesla-steel mt-1.5 mb-6">
            Per caricare e importare nuovi carnet di voucher nel tuo Vault Supabase, devi prima effettuare l&apos;accesso.
          </p>
          <Link
            href="/login"
            className="btn-tesla-primary w-full py-2.5 text-xs font-semibold block shadow-sm"
          >
            Accedi o Registrati
          </Link>
          <Link
            href="/"
            className="text-xs text-tesla-steel hover:text-tesla-onyx mt-4 inline-block font-medium"
          >
            &larr; Torna all&apos;Archivio Pubblico
          </Link>
        </div>
      </main>
    );
  }

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
            Carica più PDF contemporaneamente o un file ZIP contenente i voucher The Space Cinema
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
                <Loader2 className="w-4 h-4 animate-spin" /> Salvataggio su Supabase...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Salva {extractedTickets.length} Voucher su Supabase
              </>
            )}
          </button>
        )}
      </div>

      {/* Alerts */}
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
          Il sistema estrarrà automaticamente Codice, PIN e Scadenza e caricherà i PDF su Supabase Storage.
        </p>

        <div className="mt-4">
          <button
            type="button"
            className="btn-tesla-primary px-4 py-2 text-xs font-semibold shadow-sm"
          >
            Seleziona file dal computer
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
                Puoi modificare i campi inline prima del salvataggio nel database Supabase.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setExtractedTickets([])}
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
                  <Loader2 className="w-4 h-4 animate-spin" /> Salvataggio su Supabase...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Conferma e Salva su Supabase
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
