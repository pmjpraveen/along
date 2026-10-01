import { COUNTRY_DATA } from "./countryData";

// Every country, by ISO 3166-1 alpha-2 code, sorted by name; the code is what is stored.
export const COUNTRIES: { code: string; name: string }[] = COUNTRY_DATA.map(([code, , name]) => ({ code, name }));

export const countryName = (code: string | null): string => COUNTRIES.find((c) => c.code === code)?.name ?? "Not set";

// The currency a country uses (ISO 4217), or null for none (Antarctica). Every code is in the currencies table.
export const currencyOf = (code: string): string | null => COUNTRY_DATA.find((c) => c[0] === code)?.[3] ?? null;

// The flag for a code, made of the two regional-indicator letters ("IN" -> the Indian flag).
export const flagOf = (code: string): string => [...code.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");

// The passport for each country: its ISO three-letter code (printed on the passport's machine-readable lines) and the colour of the
// cover. Known covers are listed; any other country gets one of the classic passport colours, picked from its code so it never changes.
const KNOWN_COVER: Record<string, string> = {
  AU: "#1c2a55",
  BD: "#0f5a3a",
  BR: "#1c2f6b",
  CA: "#7a1626",
  CN: "#a01c1c",
  FR: "#1c2f6b",
  DE: "#8a1630",
  HK: "#1d3a6e",
  IN: "#14285a",
  ID: "#0f5a3a",
  IE: "#0f5a3a",
  IT: "#1c2f6b",
  JP: "#1c2f6b",
  KE: "#1f4f7a",
  MY: "#1c2f6b",
  MX: "#0f5a3a",
  NP: "#a01c3a",
  NL: "#1c2f6b",
  NZ: "#1b1b1b",
  NG: "#0f5a3a",
  PK: "#1a6a3a",
  PH: "#7a1626",
  SA: "#1a6a3a",
  SG: "#b3202a",
  ZA: "#1a6a3a",
  KR: "#1a6a3a",
  ES: "#8a1630",
  LK: "#1c2f6b",
  SE: "#8a1630",
  CH: "#b3202a",
  TH: "#7a1626",
  TR: "#7a1626",
  AE: "#1b1b1b",
  GB: "#1c2f6b",
  US: "#14285a",
  VN: "#1a6a3a",
};
const CLASSIC = ["#14285a", "#0f5a3a", "#7a1626", "#1b1b1b", "#1c2f6b", "#1a6a3a"];
export const PASSPORTS: Record<string, { iso3: string; cover: string }> = Object.fromEntries(
  COUNTRY_DATA.map(([code, iso3]) => [code, { iso3, cover: KNOWN_COVER[code] ?? CLASSIC[(code.charCodeAt(0) + code.charCodeAt(1)) % CLASSIC.length] }]),
);
