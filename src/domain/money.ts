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

function symbol(code: string): string {
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
