"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, LogOut, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setUserEmail(data.user.email);
        } else {
          setUserEmail(null);
        }
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUserEmail(session?.user?.email ?? null);
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUserEmail(null);
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  return (
    <header className="bg-white border-b border-tesla-border sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded bg-tesla-onyx flex items-center justify-center text-white font-bold text-xs tracking-wider group-hover:bg-tesla-carbon transition-colors">
              CP
            </div>
            <div>
              <span className="font-semibold text-base text-tesla-onyx tracking-tight block leading-tight">
                CinePass Vault
              </span>
              <span className="text-[10px] text-tesla-steel tracking-wider uppercase font-medium">
                The Space Cinema
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium">
            <Link
              href="/"
              className={`py-5 transition-colors ${
                pathname === "/"
                  ? "text-tesla-onyx border-b-2 border-tesla-onyx font-semibold"
                  : "text-tesla-steel hover:text-tesla-onyx"
              }`}
            >
              Dashboard
            </Link>
            {/* 'Importa PDF / ZIP' is only visible to logged-in users */}
            {userEmail && (
              <Link
                href="/import"
                className={`py-5 transition-colors ${
                  pathname === "/import"
                    ? "text-tesla-onyx border-b-2 border-tesla-onyx font-semibold"
                    : "text-tesla-steel hover:text-tesla-onyx"
                }`}
              >
                Importa PDF / ZIP
              </Link>
            )}
            <Link
              href="/history"
              className={`py-5 transition-colors ${
                pathname === "/history"
                  ? "text-tesla-onyx border-b-2 border-tesla-onyx font-semibold"
                  : "text-tesla-steel hover:text-tesla-onyx"
              }`}
            >
              Storico Film
            </Link>
            <Link
              href="/settings"
              className={`py-5 transition-colors ${
                pathname === "/settings"
                  ? "text-tesla-onyx border-b-2 border-tesla-onyx font-semibold"
                  : "text-tesla-steel hover:text-tesla-onyx"
              }`}
            >
              Impostazioni
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* 'Nuovo Carnet' button is strictly hidden when not logged in */}
          {userEmail && (
            <Link
              href="/import"
              className="btn-tesla-primary px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuovo Carnet</span>
              <span className="sm:hidden">Carica</span>
            </Link>
          )}

          {userEmail && <div className="h-5 w-px bg-tesla-border"></div>}

          {loading ? (
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse"></div>
          ) : userEmail ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-tesla-onyx text-white flex items-center justify-center text-xs font-semibold">
                {userEmail.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-medium text-tesla-onyx block leading-tight truncate max-w-[140px]">
                  {userEmail}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-[10px] text-tesla-gray hover:text-tesla-blue flex items-center gap-1"
                >
                  <LogOut className="w-2.5 h-2.5" />
                  Disconnetti
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="btn-tesla-primary px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              Accedi
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
