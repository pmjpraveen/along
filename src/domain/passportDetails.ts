import { hashSeed } from "./stampWear";

// What the passport's data page prints, worked out from the profile so it is the same every time. The number is decorative (along passports are not
// travel documents): two letters from the country, then seven digits from the person's name and join date.
export function passportNumber(country: string | null, name: string, since: string): string {
  const letters = (country ?? "").toUpperCase().replace(/[^A-Z]/g, "").padEnd(2, "A").slice(0, 2);
  return letters + String(hashSeed(`${name}|${since}`) % 10_000_000).padStart(7, "0");
}

export const MRZ_WIDTH = 44;

// The machine-readable lines at the foot of a data page, laid out like a real passport's: two lines of 44 characters, capitals, digits and "<" only. The first is the document
// type, the country, then the surname and given names ("Rahul Kumar" prints as KUMAR<<RAHUL); the second packs the passport number, country, dates and a run of digits, so the strip is
// dense with no long runs of filler. Accents are dropped from the name, and the digits are made up from the holder's number (they are not real check digits).
export function mrzLines(p: { iso3: string; name: string; number: string; issued: string }): [string, string] {
  const clean = p.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z ]/g, "").trim().split(/\s+/).filter(Boolean);
  const surname = clean.length ? clean[clean.length - 1] : "TRAVELLER";
  const given = clean.slice(0, -1).join("<");
  const code = p.iso3.toUpperCase().replace(/[^A-Z]/g, "").padEnd(3, "<").slice(0, 3);
  const fit = (text: string) => text.padEnd(MRZ_WIDTH, "<").slice(0, MRZ_WIDTH);
  const yymmdd = p.issued.replace(/-/g, "").slice(2, 8).padEnd(6, "0");
  const expires = `${String((Number(yymmdd.slice(0, 2)) + 10) % 100).padStart(2, "0")}${yymmdd.slice(2)}`;
  const digits = String(hashSeed(`${p.number}|${p.name}`)).padStart(10, "0");
  const number = p.number.toUpperCase().replace(/[^A-Z0-9]/g, "").padEnd(9, "<").slice(0, 9);
  const check = (s: string) => String([...s].reduce((n, c) => n + c.charCodeAt(0), 0) % 10);
  return [
    fit(`P<${code}${surname}<<${given}`),
    fit(`${number}${check(number)}${code}${yymmdd}${check(yymmdd)}M${expires}${check(expires)}${digits}${digits.slice(0, 4)}${check(digits)}${check(number + digits)}`),
  ];
}
