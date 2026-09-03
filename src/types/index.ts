export interface Voucher {
  id: string;
  user_id: string;
  code: string;
  pin: string;
  expiration_date: string; // ISO date string YYYY-MM-DD
  circuit: string;
  sf_code?: string | null;
  beneficiary?: string | null;
  pdf_storage_path?: string | null;
  pdf_filename?: string | null;
  pdf_url?: string | null;
  is_used: boolean;
  used_at?: string | null;
  movie_title?: string | null;
  movie_poster_url?: string | null;
  viewing_date?: string | null;
  notes?: string | null;
  batch_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParsedTicket {
  id: string;
  filename: string;
  file?: File;
  code: string;
  pin: string;
  expirationDate: string; // YYYY-MM-DD
  rawExpirationDate?: string;
  circuit: string;
  sfCode?: string;
  beneficiary?: string;
  isValid: boolean;
  errorMessage?: string;
  pdfBase64?: string;
}

export interface DashboardStats {
  availableCount: number;
  expiringSoonCount: number;
  usedCount: number;
  totalCount: number;
}
