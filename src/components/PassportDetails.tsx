import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { countryName, flagOf, PASSPORTS } from "../domain/countries";
import { initialsOf } from "../domain/initials";
import { mrzLines, passportNumber } from "../domain/passportDetails";
import { longDate } from "../domain/trip";
import { color, font } from "../theme/tokens";

export type Holder = { name: string; country: string | null; avatarUrl: string | null; since: string };
const INK = "#2b2a28";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.field}>
      <Text maxFontSizeMultiplier={1.2} style={s.label}>{label}</Text>
      <Text maxFontSizeMultiplier={1.2} style={s.value}>{value}</Text>
    </View>
  );
}

// The data page, drawn upright in a landscape box (w wide, h tall) with the spine along its top edge: the holder's photo, the printed details, and the two machine-readable
// lines along the bottom (each character in its own fixed-width cell). It is read straight from the profile; the number is decorative.
export function PassportDetails({ holder, trips, w, h, spineBelow = false, onPhotoReady }: { holder?: Holder; trips: number; w: number; h: number; spineBelow?: boolean; onPhotoReady?: () => void }) {
  const name = holder?.name?.trim() || "Traveller";
  const passport = holder?.country ? PASSPORTS[holder.country] : undefined;
  const iso3 = passport?.iso3 ?? "XXX";
  const number = passportNumber(holder?.country ?? null, name, holder?.since ?? "");
  const issued = holder?.since ?? "";
  const lines = mrzLines({ iso3, name, number, issued });
  const nationality = holder?.country ? countryName(holder.country) : "Not set";
  const cell = (w - 36 - 8) / 30;
  // A page without a photo is ready at once; with one, only once it has loaded (the page is photographed for the curl).
  useEffect(() => { if (!holder?.avatarUrl) onPhotoReady?.(); }, [holder?.avatarUrl, onPhotoReady]);
  return (
    <View accessible accessibilityLabel={`Passport of ${name}. Nationality ${nationality}. ${trips === 1 ? "1 trip" : `${trips} trips`}.`} style={[s.root, { width: w, height: h }, spineBelow ? s.spineBelow : null]}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
        {[40, 62, 84, 106, 128, 150].map((r) => <Circle key={r} cx={w * 0.72} cy={h * 0.42} r={r} fill="none" stroke="#7a6a3a" strokeOpacity={0.07} strokeWidth={1} />)}
      </Svg>
      <View style={s.head}>
        <Text maxFontSizeMultiplier={1.2} style={s.title}>PASSPORT</Text>
        {holder?.country ? <Text style={s.flag}>{flagOf(holder.country)}</Text> : null}
      </View>
      <View style={s.body}>
        <View style={s.photo}>
          {holder?.avatarUrl ? <Image accessibilityIgnoresInvertColors source={{ uri: holder.avatarUrl }} style={s.photoImg} onLoadEnd={onPhotoReady} />
            : <Text maxFontSizeMultiplier={1.2} style={s.initials}>{initialsOf(name)}</Text>}
        </View>
        <View style={s.col}>
          <Field label="NAME" value={name.toUpperCase()} />
          <Field label="NATIONALITY" value={nationality.toUpperCase()} />
          <Field label="DATE OF ISSUE" value={issued ? longDate(issued).toUpperCase() : "-"} />
        </View>
        <View style={s.col}>
          <Field label="PASSPORT NO." value={number} />
          <Field label="TYPE / CODE" value={`P / ${iso3}`} />
          <Field label="TRIPS" value={String(trips)} />
        </View>
      </View>
      <View style={s.grow} />
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.mrz}>
        {lines.map((line, i) => (
          <View key={i} style={s.mrzLine}>
            {[...line].map((c, j) => <Text key={j} style={[s.mrzCell, { width: cell }]}>{c}</Text>)}
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { paddingHorizontal: 18, paddingTop: 14 + 8, paddingBottom: 12 },
  spineBelow: { paddingTop: 16, paddingBottom: 14 + 14 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontFamily: font.medium, fontSize: 12, letterSpacing: 3.5, color: color.slate },
  flag: { fontSize: 20 },
  body: { flexDirection: "row", gap: 18, marginTop: 14 },
  photo: { width: 112, height: 142, borderRadius: 3, borderWidth: 1, borderColor: "rgba(60,40,10,0.25)", backgroundColor: "#e6e0d3", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  photoImg: { width: 112, height: 142 },
  initials: { fontFamily: font.medium, fontSize: 34, color: "#8a806c" },
  col: { flex: 1, gap: 16 },
  field: { gap: 1 },
  label: { fontFamily: font.medium, fontSize: 9, letterSpacing: 1.2, color: color.slate },
  value: { fontFamily: font.medium, fontSize: 14, letterSpacing: 0.2, color: INK },
  grow: { flex: 1 },
  mrz: { backgroundColor: "rgba(60,40,10,0.06)", borderRadius: 3, paddingVertical: 6, paddingHorizontal: 4, gap: 2, alignSelf: "flex-start" },
  mrzLine: { flexDirection: "row" },
  mrzCell: { textAlign: "center", fontFamily: font.medium, fontSize: 12.5, lineHeight: 16, color: INK },
});
