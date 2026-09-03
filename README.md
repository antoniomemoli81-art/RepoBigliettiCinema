# 🎟️ CinePass Vault (The Space Cinema)

Applicazione web moderna, veloce ed elegante per l'archiviazione, la consultazione e il tracciamento dei carnet di voucher per **The Space Cinema**, realizzata con **Next.js**, **Supabase**, **Vercel** e progettata seguendo gli stilemi del **Tesla Design System** (Refero).

---

## 🚀 Caratteristiche Principali

1. **Gestione Carnet & Voucher The Space Cinema**:
   - Riconoscimento e visualizzazione immediata di **Codice Biglietto** (es. `MR010739872`), **PIN** (es. `9118`), **Data di Scadenza**, e file PDF associato.
   - Pulsanti rapidi a 1-click **"Copia Codice"** e **"Copia PIN"** per prenotare all'istante dall'App o dal sito del cinema.

2. **Importazione Massiva Intelligente (`/import`)**:
   - Caricamento drag & drop di **più PDF contemporaneamente** o di un singolo file **ZIP** contenente i voucher.
   - Estrazione automatica server-side dei dati via OCR/regex con tabella di convalida pre-salvataggio.

3. **Monitoraggio Scadenze & Avvisi**:
   - Badge prioritario visivo dinamico per i voucher con scadenza imminente ($\le 30$ giorni).
   - Contatori KPI in tempo reale: *Disponibili da Riscatto*, *In Scadenza*, *Film Visti*.

4. **Tracciamento Utilizzo & Storico Film (`/history`)**:
   - Registrazione dell'uso con un semplice click: inserisci il titolo del film e la data di visione.
   - Catalogo storico dei film visti nel tempo con consultazione del voucher PDF originale archiviato.

5. **Doppia Autenticazione & Sicurezza**:
   - Accesso con **Google OAuth** a 1-click o con credenziali tradizionali **Email e Password**.
   - Isolamento multi-utente tramite **Supabase Row Level Security (RLS)**: ogni utente ha il proprio vault privato e protetto.

6. **Design System di Livello Mondiale**:
   - Interfaccia minimalista basata sulla guida stile **Tesla** di Refero: accento primario *Tesla Blue* (`#3e6ae1`), superfici *Pure White* & *Off-White*, tipografia tecnica, raggi di curvatura a 4px (pulsanti/input) e 8px (card).

---

## 🛠️ Stack Tecnologico

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Design Tokens personalizzati Tesla)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL + RLS + Supabase Auth)
- **Storage**: Supabase Storage (bucket privato `vouchers` per i file PDF)
- **Elaborazione PDF/ZIP**: `pdf-parse` + `jszip`
- **Icone**: `lucide-react`
- **Hosting**: [Vercel](https://vercel.com/)

---

## 📦 Setup e Configurazione Supabase

### 1. Database & Tabella
1. Accedi alla tua dashboard su [Supabase](https://supabase.com/) e crea un nuovo progetto.
2. Vai nella sezione **SQL Editor** (barra laterale sinistra).
3. Apri il file [`supabase/schema.sql`](./supabase/schema.sql), copiane l'intero contenuto e incollalo nell'editor SQL.
4. Clicca su **Run** per creare la tabella `vouchers`, gli indici di ricerca, le policy di sicurezza RLS e il bucket di storage.

### 2. Configurazione Google OAuth (Opzionale ma Consigliata)
1. Vai su [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Crea un **OAuth Client ID** di tipo *Web Application*.
3. Come **Authorized Redirect URI**, inserisci l'URL fornito da Supabase in **Authentication** -> **Providers** -> **Google** (formato: `https://<tuo-progetto>.supabase.co/auth/v1/callback`).
4. Inserisci il `Client ID` e il `Client Secret` in Supabase e abilita il provider Google.

### 3. Variabili d'Ambiente
Copia il file `.env.local.example` in `.env.local`:
```bash
cp .env.local.example .env.local
```
Compila i seguenti parametri:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tuo-progetto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=la-tua-anon-key-di-supabase
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 💻 Esecuzione in Locale

Avvia il server di sviluppo:
```bash
npm run dev
```
Apri il browser su [http://localhost:3000](http://localhost:3000).

> **Nota di test locale**: se non hai ancora configurato Supabase, l'applicazione funziona automaticamente in modalità demo persistente (tramite salvataggio locale), permettendoti di esplorare tutte le funzionalità e i voucher di prova all'istante.

---

## 🚀 Deploy su Vercel

1. Crea una repository su GitHub e fai il push del progetto:
   ```bash
   git init
   git add .
   git commit -m "feat: init CinePass Vault app"
   git branch -M main
   git remote add origin https://github.com/tuo-username/RepoBigliettiCinema.git
   git push -u origin main
   ```
2. Vai su [Vercel](https://vercel.com/) e fai il login.
3. Clicca su **Add New...** -> **Project** e seleziona la repository `RepoBigliettiCinema`.
4. Nella sezione **Environment Variables**, aggiungi:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (es. `https://tuo-progetto.vercel.app`)
5. Clicca su **Deploy**. La tua applicazione sarà online in circa 1 minuto!
