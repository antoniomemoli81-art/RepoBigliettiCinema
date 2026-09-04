"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Database,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Server,
  Calendar,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface KeepAliveResponse {
  status: "ok" | "error";
  message: string;
  timestamp: string;
  latency_ms?: number;
  itemsFound?: number;
  error?: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<KeepAliveResponse | null>(null);
  const [lastExecuted, setLastExecuted] = useState<Date | null>(null);

  const handleKeepAlivePing = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/keep-alive", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      const data: KeepAliveResponse = await res.json();
      setResult(data);
      setLastExecuted(new Date());
    } catch (err: any) {
      setResult({
        status: "error",
        message: "Errore di rete durante la chiamata all'endpoint",
        timestamp: new Date().toISOString(),
        error: err?.message || String(err),
      });
      setLastExecuted(new Date());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-tesla-steel mb-2">
          <Link href="/" className="hover:text-tesla-onyx transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-tesla-onyx font-medium">Impostazioni & Sistema</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-tesla-onyx tracking-tight">
              Impostazioni & Diagnostica
            </h1>
            <p className="text-xs text-tesla-steel mt-1">
              Monitoraggio dell&apos;infrastruttura cloud, stato Supabase e prevenzione pausa inattività.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Keep-Alive Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-tesla-container p-6 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-tesla-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-blue-50 text-tesla-blue flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-tesla-onyx">
                    Supabase Database Keep-Alive
                  </h2>
                  <p className="text-xs text-tesla-steel">
                    Prevenzione automatica della sospensione del database per inattività (piano Free)
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Attivo
              </span>
            </div>

            {/* Explanatory text */}
            <div className="text-xs text-tesla-steel leading-relaxed mb-6 space-y-2">
              <p>
                I database su Supabase (Free Tier) entrano in modalità di pausa se non ricevono alcuna richiesta
                per <strong>7 giorni consecutivi</strong>. Al risveglio, la prima richiesta può subire fino a 15-30 secondi di cold start.
              </p>
              <p>
                Il meccanismo di <strong>Keep-Alive</strong> esegue una query SQL reale ma ultra-leggera
                (<code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">SELECT id FROM public.vouchers LIMIT 1</code>)
                per mantenere il cluster PostgreSQL costantemente sveglio e responsivo.
              </p>
            </div>

            {/* Schedulazioni attive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <div className="flex items-center gap-2 text-xs font-semibold text-tesla-onyx mb-1">
                  <Calendar className="w-4 h-4 text-tesla-blue" />
                  Vercel Cron Job
                </div>
                <div className="text-[11px] text-tesla-steel font-mono">
                  0 8 * * 1,4
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Ogni Lunedì e Giovedì alle 08:00 UTC
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <div className="flex items-center gap-2 text-xs font-semibold text-tesla-onyx mb-1">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  cron-job.org
                </div>
                <div className="text-[11px] text-tesla-steel font-mono">
                  Giornaliero (Daily)
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Ogni giorno alle ore 12:00
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="pt-2 border-t border-tesla-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-xs text-tesla-steel">
                Endpoint: <code className="text-slate-800 font-mono font-medium">/api/keep-alive</code>
              </div>

              <button
                onClick={handleKeepAlivePing}
                disabled={loading}
                className="btn-tesla-primary px-4 py-2 text-xs font-medium flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>{loading ? "Esecuzione Ping..." : "📡 Esegui Ping Keep-Alive"}</span>
              </button>
            </div>

            {/* Result display */}
            {result && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                {result.status === "ok" ? (
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span className="font-semibold text-sm">Ping Eseguito con Successo!</span>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-medium">
                        HTTP 200 OK
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3 pt-3 border-t border-emerald-200/60">
                      <div>
                        <div className="text-emerald-700/80 text-[11px]">Latenza DB</div>
                        <div className="font-semibold text-emerald-950 font-mono text-sm">
                          {result.latency_ms} ms
                        </div>
                      </div>
                      <div>
                        <div className="text-emerald-700/80 text-[11px]">Record Letti</div>
                        <div className="font-semibold text-emerald-950 font-mono text-sm">
                          {result.itemsFound}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-emerald-700/80 text-[11px]">Data & Ora</div>
                        <div className="font-medium text-emerald-950 text-[11px] truncate">
                          {lastExecuted ? lastExecuted.toLocaleString("it-IT") : result.timestamp}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-900">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-sm">Errore durante il Ping</span>
                    </div>
                    <p className="text-xs text-red-700 mb-2">{result.message}</p>
                    {result.error && (
                      <code className="block p-2 bg-red-100 rounded text-[11px] font-mono text-red-800 break-all">
                        {result.error}
                      </code>
                    )}
                  </div>
                )}

                {/* Raw JSON viewer */}
                <details className="mt-3 text-[11px]">
                  <summary className="cursor-pointer text-slate-500 hover:text-slate-800 transition-colors">
                    Visualizza risposta JSON grezza
                  </summary>
                  <pre className="mt-2 p-3 bg-slate-900 text-emerald-400 rounded-md font-mono text-[10px] overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info Cards */}
        <div className="space-y-6">
          <div className="card-tesla-container p-6 bg-white shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 border-b border-tesla-border mb-4">
              <Database className="w-4 h-4 text-tesla-onyx" />
              <h3 className="text-sm font-semibold text-tesla-onyx">Database Supabase</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[11px] text-tesla-steel">Host PostgreSQL</div>
                <div className="font-mono text-tesla-onyx text-[11px] truncate">
                  wlmrrtbobyzkltpfiyqz.supabase.co
                </div>
              </div>

              <div>
                <div className="text-[11px] text-tesla-steel">Tabella Keep-Alive</div>
                <div className="font-mono text-tesla-onyx font-medium">
                  public.vouchers
                </div>
              </div>

              <div>
                <div className="text-[11px] text-tesla-steel">Sicurezza & RLS</div>
                <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Row Level Security Attiva</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-tesla-steel">Storage PDF</div>
                <div className="font-mono text-tesla-onyx">
                  bucket: vouchers
                </div>
              </div>
            </div>
          </div>

          <div className="card-tesla-container p-6 bg-white shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 border-b border-tesla-border mb-4">
              <Server className="w-4 h-4 text-tesla-onyx" />
              <h3 className="text-sm font-semibold text-tesla-onyx">Deployment & Cron</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[11px] text-tesla-steel">Hosting</div>
                <div className="font-medium text-tesla-onyx">Vercel Serverless</div>
              </div>

              <div>
                <div className="text-[11px] text-tesla-steel">Architettura</div>
                <div className="font-medium text-tesla-onyx">Next.js 14 App Router</div>
              </div>

              <div>
                <div className="text-[11px] text-tesla-steel">External Cron Manager</div>
                <a
                  href="https://console.cron-job.org"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-tesla-blue hover:underline font-medium"
                >
                  cron-job.org Dashboard
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
