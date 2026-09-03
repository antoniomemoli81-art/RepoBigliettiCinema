"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Errore durante l'accesso con Google");
      setLoading(false);
    }
  };

  // Email/Password Login or Sign Up
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Inserisci email e password");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage("Registrazione completata! Controlla la tua email per confermare l'account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
      }
    } catch (err: any) {
      // In local mode if Supabase keys are placeholder, allow demo login
      if (err.message?.includes("placeholder") || err.message?.includes("fetch")) {
        router.push("/");
      } else {
        setError(err.message || "Credenziali non valide o errore di connessione.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-[#fafafa]">
      <div className="card-tesla-container p-8 max-w-sm w-full bg-white shadow-xl text-center">
        {/* Logo Brand */}
        <div className="w-12 h-12 mx-auto rounded-lg bg-tesla-onyx flex items-center justify-center text-white font-bold text-lg mb-3 shadow-sm">
          CP
        </div>
        <h1 className="text-xl font-bold text-tesla-onyx tracking-tight">CinePass Vault</h1>
        <p className="text-xs text-tesla-steel mt-1 mb-6">
          Accedi al tuo archivio voucher The Space Cinema
        </p>

        {/* Error / Success Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 text-red-700 border border-red-200 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Google OAuth CTA (Tesla Blue) */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="btn-tesla-primary w-full py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2.5 shadow-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continua con Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-tesla-border flex-1"></div>
          <span className="text-[11px] text-tesla-gray uppercase font-medium">
            oppure con email
          </span>
          <div className="h-px bg-tesla-border flex-1"></div>
        </div>

        {/* Form Email / Password */}
        <form onSubmit={handleEmailAuth} className="space-y-3 text-left">
          <div>
            <label className="block text-[11px] font-semibold text-tesla-steel uppercase mb-1">
              Email
            </label>
            <input
              type="email"
              required
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 text-xs border border-tesla-border rounded outline-none focus:border-tesla-blue focus:ring-1 focus:ring-tesla-blue"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-tesla-steel uppercase mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 text-xs border border-tesla-border rounded outline-none focus:border-tesla-blue focus:ring-1 focus:ring-tesla-blue"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-tesla-onyx text-white py-2 text-xs font-semibold rounded hover:bg-tesla-carbon transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              "Registrati"
            ) : (
              "Accedi con Email"
            )}
          </button>
        </form>

        {/* Toggle Sign in / Sign up */}
        <div className="mt-5 pt-4 border-t border-[#eeeeee] text-xs text-tesla-steel">
          {isSignUp ? (
            <p>
              Hai già un account?{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-tesla-blue font-semibold hover:underline"
              >
                Accedi
              </button>
            </p>
          ) : (
            <p>
              Non hai un account?{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-tesla-blue font-semibold hover:underline"
              >
                Registrati
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
