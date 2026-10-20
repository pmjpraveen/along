import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { exportExpenses } from "../exportExpenses";
import { FileText, Receipt } from "../icons";
import { haptic } from "../haptics";
import { toast } from "../stores/toast";
import { color, radius, space } from "../theme/tokens";
import { BottomSheet, SheetRows } from "./BottomSheet";
import { ListItem } from "./ListItem";

const icon = (I: typeof FileText) => <View style={s.icon}><I size={20} color={color.iconInk} strokeWidth={1.75} /></View>;

// Takes the trip's expenses out of the app: a spreadsheet (optionally with the payments between people as a second file) or a PDF.
export function ExportSheet({ visible, onClose, tripId }: { visible: boolean; onClose: () => void; tripId: string }) {
  const [busy, setBusy] = useState(false);
  const [withPayments, setWithPayments] = useState(false);
  const go = async (kind: "csv" | "pdf") => {
    if (busy) return;
    setBusy(true);
    const r = await exportExpenses(tripId, kind, withPayments, new Date());
    setBusy(false);
    if (r.ok) { haptic.success(); onClose(); } else toast(r.message);
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Export expenses" body={busy ? "Preparing the file…" : "Every expense, with who paid and who owes what."}>
      <SheetRows>
        <ListItem title="Spreadsheet (CSV)" subtitle="Opens in Excel, Numbers and Sheets" leading={icon(Receipt)} trailing="chevron" disabled={busy} onPress={() => go("csv")} />
        <ListItem title="PDF" subtitle="A printable list with the total" leading={icon(FileText)} trailing="chevron" disabled={busy} onPress={() => go("pdf")} />
        <ListItem title="Include payments between people" subtitle="Spreadsheet only, as a second file" trailing="switch" checked={withPayments} onPress={() => setWithPayments((v) => !v)} />
      </SheetRows>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  icon: { width: 40, height: 40, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center", marginRight: space.s4 },
});
