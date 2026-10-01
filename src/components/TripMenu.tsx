import { useRouter } from "expo-router";
import { Flag, Settings, Share2, Trash2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import { createInviteLink } from "../api/invites";
import { listMembers } from "../api/members";
import { deleteTrip, loadTripSettings } from "../api/trips";
import { tripShareMessage } from "../domain/guestInvite";
import { haptic } from "../haptics";
import { toast } from "../stores/toast";
import { color, radius } from "../theme/tokens";
import { BottomSheet, SheetRows } from "./BottomSheet";
import { Dialog } from "./Dialog";
import { ListItem } from "./ListItem";

type Choice = "settings" | "share" | "end" | "delete";

// The menu behind the trip page's three-dots button, a sheet like the "+" one: Trip settings for everyone, and End trip and Delete trip for the owner
// (the server refuses anyone else too). Choosing one closes the sheet first and then opens what it leads to: the settings page, the end-trip
// review, or a confirmation that deletes the trip for everyone and returns to Home.
export function TripMenu({ tripId, isOwner, visible, onClose }: { tripId: string; isOwner: boolean; visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const chosen = useRef<Choice | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (c: Choice) => { chosen.current = c; onClose(); };
  const closed = () => {
    const c = chosen.current;
    chosen.current = null;
    if (c === "settings") router.push({ pathname: "/trip/[id]/settings", params: { id: tripId } });
    else if (c === "share") share();
    else if (c === "end") router.push({ pathname: "/trip/[id]/complete", params: { id: tripId } });
    else if (c === "delete") { setError(null); setConfirming(true); }
  };
  const share = async () => {
    const [link, trip, people] = await Promise.all([createInviteLink(tripId), loadTripSettings(tripId), listMembers(tripId)]);
    if (!link.ok) return toast(link.message);
    if (!trip.ok) return toast(trip.message);
    const { name, destination, start, end } = trip.settings;
    await Share.share({ message: tripShareMessage({ trip: name, destination, start, end, people: people.ok ? people.members.length : 1, token: link.token }) });
  };
  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    const res = await deleteTrip(tripId);
    setDeleting(false);
    if (!res.ok) { haptic.warn(); setError(res.message); return; }
    setConfirming(false);
    haptic.success();
    toast("Trip deleted");
    router.replace("/");
  };
  const icon = (I: typeof Flag, tone: string = color.iconInk) => <View style={s.icon}><I size={22} color={tone} strokeWidth={1.75} /></View>;

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} onClosed={closed} title="Trip options">
        <SheetRows>
        <ListItem title="Trip settings" subtitle="Name, dates and currency" leading={icon(Settings)} trailing="chevron" onPress={() => choose("settings")} />
        {isOwner && <ListItem title="Share trip" subtitle="Invite friends with a link" leading={icon(Share2)} trailing="chevron" onPress={() => choose("share")} />}
        {isOwner && <ListItem title="End trip" subtitle="Wrap it up and keep the memories" leading={icon(Flag)} trailing="chevron" onPress={() => choose("end")} />}
        {isOwner && <ListItem title="Delete trip" subtitle="Removes it for everyone" leading={icon(Trash2, color.alarmRed)} trailing="chevron" onPress={() => choose("delete")} />}
        </SheetRows>
      </BottomSheet>
      <Dialog visible={confirming} onClose={() => setConfirming(false)} title="Delete this trip?" subheader="This can't be undone"
        body={error ?? "The trip and everything on it, its plans, expenses, payments and photos, will be erased for everyone. This can't be recovered."}
        actionLabel={deleting ? "Deleting…" : "Delete trip"} actionType="destructive" onAction={remove} actionBusy={deleting}
        secondaryLabel="Keep the trip" onSecondary={() => setConfirming(false)} />
    </>
  );
}

const s = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center" },
});
