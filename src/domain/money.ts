// Money is integer minor units (paise, cents, fils). No floats: amounts are parsed and formatted through strings.

// "12.5" with exponent 2 -> 1250. Null for empty, zero, negative, too many decimals, or anything that is not a plain amount.
export function parseMinor(text: string, exponent: number): number | null {
  const m = text.trim().replace(/,/g, "").match(/^(\d+)(?:\.(\d*))?$/);
  if (!m) return null;
  const frac = m[2] ?? "";
  if (frac.length > exponent || m[1].length + exponent > 15) return null;
  const minor = Number(m[1] + frac.padEnd(exponent, "0"));
  return minor > 0 ? minor : null;
}

// The phone's JS engine may not know a currency's symbol (it then gives the code), so the common ones are listed here.
const SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", AUD: "A$", CAD: "C$", SGD: "S$", AED: "AED ", THB: "฿", KRW: "₩", CHF: "CHF ", NZD: "NZ$", IDR: "Rp", VND: "₫", MYR: "RM", PHP: "₱" };

function symbol(code: string): string {
  if (SYMBOLS[code]) return SYMBOLS[code];
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" })
      .formatToParts(0).find((p) => p.type === "currency")?.value ?? code;
  } catch {
    return code;
  }
}

// 1250 with exponent 2 and INR -> "₹12.50". Always the currency's own number of decimals.
export function formatMinor(minor: number, exponent: number, code: string): string {
  const sign = minor < 0 ? "-" : "";
  const abs = String(Math.abs(minor)).padStart(exponent + 1, "0");
  const whole = abs.slice(0, abs.length - exponent).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = exponent ? `.${abs.slice(abs.length - exponent)}` : "";
  return `${sign}${symbol(code)}${whole}${frac}`;
}

// The amount split for display: "₹8,533.05" -> { prefix: "₹", whole: "8,533", frac: ".05" } (frac is "" for zero-decimal currencies).
export function moneyParts(minor: number, exponent: number, code: string) {
  const s = formatMinor(minor, exponent, code);
  const cut = exponent ? s.lastIndexOf(".") : s.length;
  const m = /^(-?[^\d-]*)(.*)$/.exec(s.slice(0, cut))!;
  return { prefix: m[1], whole: m[2], frac: s.slice(cut) };
}
