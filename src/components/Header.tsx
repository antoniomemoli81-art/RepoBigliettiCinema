"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Film, ArrowUpRight, LogOut, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setUserEmail(data.user.email);
        }
      });
    } catch {
      // client error fallback
    }
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
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
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/import"
            className="btn-tesla-primary px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nuovo Carnet</span>
            <span className="sm:hidden">Carica</span>
          </Link>

          <div className="h-5 w-px bg-tesla-border"></div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-tesla-onyx text-white flex items-center justify-center text-xs font-semibold">
              {userEmail ? userEmail.slice(0, 2).toUpperCase() : "AM"}
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-xs font-medium text-tesla-onyx block leading-tight truncate max-w-[140px]">
                {userEmail || "Antonio Memoli"}
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
        </div>
      </div>
    </header>
  );
}
