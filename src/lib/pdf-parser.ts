export interface ExtractedVoucherData {
  code: string;
  pin: string;
  expirationDate: string; // formatted YYYY-MM-DD
  rawExpirationDate: string;
  circuit: string;
  sfCode?: string;
  beneficiary?: string;
}

export function parseVoucherText(rawText: string): ExtractedVoucherData {
  const normalizedText = rawText.replace(/\r\n/g, "\n");

  // 1. Extract Code: Look for "CODICE: MR010739872" or barcode pattern "MR[0-9]+"
  let code = "";
  const codeMatch = normalizedText.match(/CODICE:\s*([A-Z0-9]+)/i) || normalizedText.match(/\b(MR\d{8,11})\b/i);
  if (codeMatch) {
    code = codeMatch[1].trim().toUpperCase();
  }

  // 2. Extract PIN: Look for "PIN: 9118" or "PIN:\s*(\d{4,6})"
  let pin = "";
  const pinMatch = normalizedText.match(/PIN:\s*(\d{4,6})/i);
  if (pinMatch) {
    pin = pinMatch[1].trim();
  }

  // 3. Extract Expiration Date: "VALIDO FINO AL 07/12/2026" or "SCADENZA:\s*DD/MM/YYYY"
  let expirationDate = "";
  let rawExpirationDate = "";
  const dateMatch =
    normalizedText.match(/(?:VALIDO\s+FINO\s+AL|SCADENZA(?:\s*:)?)\s*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})/i) ||
    normalizedText.match(/(\d{2}\/\d{2}\/\d{4})/);

  if (dateMatch) {
    rawExpirationDate = dateMatch[1].trim();
    // Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
    const parts = rawExpirationDate.split(/[\/\.-]/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      expirationDate = `${year}-${month}-${day}`;
    }
  }

  // 4. Extract SF Code (if present)
  let sfCode = "";
  const sfMatch = normalizedText.match(/SF:\s*([A-Z0-9]+)/i);
  if (sfMatch) {
    sfCode = sfMatch[1].trim();
  }

  // 5. Extract Beneficiary (if present)
  let beneficiary = "";
  const benMatch = normalizedText.match(/BENEFICIARIO:\s*([^\n\r]+)/i);
  if (benMatch) {
    beneficiary = benMatch[1].trim();
  }

  return {
    code,
    pin,
    expirationDate,
    rawExpirationDate,
    circuit: "The Space Cinema",
    sfCode,
    beneficiary,
  };
}

export function isExpiringSoon(expirationDateStr: string, daysThreshold = 30): boolean {
  if (!expirationDateStr) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDateStr);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= daysThreshold;
}

export function isExpired(expirationDateStr: string): boolean {
  if (!expirationDateStr) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDateStr);
  expDate.setHours(0, 0, 0, 0);

  return expDate.getTime() < now.getTime();
}

export function formatItalianDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
