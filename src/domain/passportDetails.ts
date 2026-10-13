import { hashSeed } from "./stampWear";

// What the passport's data page prints, worked out from the profile so it is the same every time. The number is decorative (along passports are not
// travel documents): two letters from the country, then seven digits from the person's name and join date.
export function passportNumber(country: string | null, name: string, since: string): string {
  const letters = (country ?? "").toUpperCase().replace(/[^A-Z]/g, "").padEnd(2, "A").slice(0, 2);
  return letters + String(hashSeed(`${name}|${since}`) % 10_000_000).padStart(7, "0");
}

// The machine-readable lines at the foot of a data page: 30 characters each, capitals, digits and "<" only. The name loses its accents, and its last word is the
// surname, as on a real passport: "Rahul Kumar" prints as KUMAR<<RAHUL.
export function mrzLines(p: { iso3: string; name: string; number: string; issued: string }): [string, string] {
  const clean = p.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z ]/g, "").trim().split(/\s+/).filter(Boolean);
  const surname = clean.length ? clean[clean.length - 1] : "TRAVELLER";
  const given = clean.slice(0, -1).join("<");
  const code = p.iso3.toUpperCase().replace(/[^A-Z]/g, "").padEnd(3, "<").slice(0, 3);
  const fit = (text: string, n = 30) => text.padEnd(n, "<").slice(0, n);
  const yymmdd = p.issued.replace(/-/g, "").slice(2, 8).padEnd(6, "<");
  return [fit(`P<${code}${surname}<<${given}`), fit(`${p.number}<${code}${yymmdd}`)];
}
