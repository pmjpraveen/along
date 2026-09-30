// The countries offered in Settings, by ISO 3166-1 alpha-2 code. A short list of common travel origins; the code is what is stored.
export const COUNTRIES: { code: string; name: string }[] = [
  ["AU", "Australia"], ["BD", "Bangladesh"], ["BR", "Brazil"], ["CA", "Canada"], ["CN", "China"], ["FR", "France"], ["DE", "Germany"], ["HK", "Hong Kong"],
  ["IN", "India"], ["ID", "Indonesia"], ["IE", "Ireland"], ["IT", "Italy"], ["JP", "Japan"], ["KE", "Kenya"], ["MY", "Malaysia"], ["MX", "Mexico"],
  ["NP", "Nepal"], ["NL", "Netherlands"], ["NZ", "New Zealand"], ["NG", "Nigeria"], ["PK", "Pakistan"], ["PH", "Philippines"], ["SA", "Saudi Arabia"],
  ["SG", "Singapore"], ["ZA", "South Africa"], ["KR", "South Korea"], ["ES", "Spain"], ["LK", "Sri Lanka"], ["SE", "Sweden"], ["CH", "Switzerland"],
  ["TH", "Thailand"], ["TR", "Turkey"], ["AE", "United Arab Emirates"], ["GB", "United Kingdom"], ["US", "United States"], ["VN", "Vietnam"],
].map(([code, name]) => ({ code, name }));

export const countryName = (code: string | null): string => COUNTRIES.find((c) => c.code === code)?.name ?? "Not set";

// The flag for a code, made of the two regional-indicator letters ("IN" -> the Indian flag).
export const flagOf = (code: string): string => [...code.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");

// The passport for each country: its ISO three-letter code (printed on the passport's machine-readable lines) and the colour of the
// cover in its most common design. Approximate: some countries have changed or run several designs.
export const PASSPORTS: Record<string, { iso3: string; cover: string }> = {
  AU: { iso3: "AUS", cover: "#1c2a55" }, BD: { iso3: "BGD", cover: "#0f5a3a" }, BR: { iso3: "BRA", cover: "#1c2f6b" }, CA: { iso3: "CAN", cover: "#7a1626" },
  CN: { iso3: "CHN", cover: "#a01c1c" }, FR: { iso3: "FRA", cover: "#1c2f6b" }, DE: { iso3: "DEU", cover: "#8a1630" }, HK: { iso3: "HKG", cover: "#1d3a6e" },
  IN: { iso3: "IND", cover: "#14285a" }, ID: { iso3: "IDN", cover: "#0f5a3a" }, IE: { iso3: "IRL", cover: "#0f5a3a" }, IT: { iso3: "ITA", cover: "#1c2f6b" },
  JP: { iso3: "JPN", cover: "#1c2f6b" }, KE: { iso3: "KEN", cover: "#1f4f7a" }, MY: { iso3: "MYS", cover: "#1c2f6b" }, MX: { iso3: "MEX", cover: "#0f5a3a" },
  NP: { iso3: "NPL", cover: "#a01c3a" }, NL: { iso3: "NLD", cover: "#1c2f6b" }, NZ: { iso3: "NZL", cover: "#1b1b1b" }, NG: { iso3: "NGA", cover: "#0f5a3a" },
  PK: { iso3: "PAK", cover: "#1a6a3a" }, PH: { iso3: "PHL", cover: "#7a1626" }, SA: { iso3: "SAU", cover: "#1a6a3a" }, SG: { iso3: "SGP", cover: "#b3202a" },
  ZA: { iso3: "ZAF", cover: "#1a6a3a" }, KR: { iso3: "KOR", cover: "#1a6a3a" }, ES: { iso3: "ESP", cover: "#8a1630" }, LK: { iso3: "LKA", cover: "#1c2f6b" },
  SE: { iso3: "SWE", cover: "#8a1630" }, CH: { iso3: "CHE", cover: "#b3202a" }, TH: { iso3: "THA", cover: "#7a1626" }, TR: { iso3: "TUR", cover: "#7a1626" },
  AE: { iso3: "ARE", cover: "#1b1b1b" }, GB: { iso3: "GBR", cover: "#1c2f6b" }, US: { iso3: "USA", cover: "#14285a" }, VN: { iso3: "VNM", cover: "#1a6a3a" },
};
