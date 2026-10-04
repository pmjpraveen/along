import { Alert } from "../../../src/components/Alert";
import { PinnedBack, useContentTop, useScrollY } from "../../../src/components/PinnedBack";
import Animated from "react-native-reanimated";
import { Skeleton } from "../../../src/components/Skeleton";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { Avatar } from "../../../src/components/Avatar";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ExternalLink, Images, MoreHorizontal, Pencil, Trash2 } from "../../../src/icons";
import { BottomSheet, SheetRows } from "../../../src/components/BottomSheet";
import { Dialog } from "../../../src/components/Dialog";
import { ListItem } from "../../../src/components/ListItem";
import { haptic } from "../../../src/haptics";
import { toast } from "../../../src/stores/toast";
import { useCallback, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addLink, addNote, addPhoto, deleteMemory, listMemories, Memory, MemoriesResult, previewLink, updateNote } from "../../../src/api/memories";
import { googlePhotosUrl } from "../../../src/domain/googlePhotos";
import { Button, PrimaryButton, TextButton } from "../../../src/components/Buttons";
import { TextField } from "../../../src/components/TextField";
import { formatDate, toIso } from "../../../src/domain/trip";
import { color, radius, space, type } from "../../../src/theme/tokens";

const mint = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Photos and notes for this trip. Each attempt keeps its key until it succeeds, so a retry saves one memory, not two.
export default function Memories() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();
  const contentTop = useContentTop();
  const router = useRouter();
  const [state, setState] = useState<MemoriesResult | null>(null);
  const [note, setNote] = useState("");
  const noteKey = useRef(mint());
  const [pending, setPending] = useState<{ uri: string; mime: string; key: string } | null>(null);
  const [linking, setLinking] = useState(false);   // the Google Photos link field is open
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const linkKey = useRef(mint());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [menu, setMenu] = useState<Memory | null>(null);        // the options sheet for one memory
  const [editing, setEditing] = useState<Memory | null>(null);   // a note being edited
  const [draft, setDraft] = useState("");
  const [deleting, setDeleting] = useState<Memory | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // A sheet and a dialog cannot be on screen together on iOS, so the next one opens once the sheet has fully left.
  const after = useRef<(() => void) | null>(null);

  const load = useCallback(async () => setState(await listMemories(id)), [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);

  const choose = (next: () => void) => { after.current = next; setMenu(null); };
  const startEdit = (m: Memory) => choose(() => { setDraft(m.body ?? ""); setActionError(null); setEditing(m); });
  const startDelete = (m: Memory) => choose(() => { setActionError(null); setDeleting(m); });
  const saveEdit = async () => {
    if (!editing || actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    const r = await updateNote(editing.id, draft);
    setActionBusy(false);
    if (!r.ok) return setActionError(r.message);
    haptic.success();
    toast("Note updated");
    setEditing(null);
    load();
  };
  const confirmDelete = async () => {
    if (!deleting || actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    const r = await deleteMemory(deleting.id);
    setActionBusy(false);
    if (!r.ok) { haptic.warn(); return setActionError(r.message); }
    haptic.success();
    toast("Memory deleted");
    setDeleting(null);
    load();
  };

  const saveNote = async () => {
    if (busy || !note.trim()) return;
    setBusy(true);
    setError(null);
    const r = await addNote(id, note, noteKey.current);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setNote("");
    noteKey.current = mint();
    load();
  };

  const saveLink = async () => {
    if (busy) return;
    const url = googlePhotosUrl(link);
    if (!url) return setLinkError("Paste a Google Photos share link, like https://photos.app.goo.gl/…");
    setBusy(true);
    setLinkError(null);
    const r = await addLink(id, url, linkKey.current, await previewLink(url));
    setBusy(false);
    if (!r.ok) return setLinkError(r.message);
    setLink("");
    setLinking(false);
    linkKey.current = mint();
    load();
  };

  const upload = async (p: { uri: string; mime: string; key: string }) => {
    setBusy(true);
    setError(null);
    const r = await addPhoto(id, p.uri, p.mime, p.key);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setPending(null);
    load();
  };

  const pickPhoto = async () => {
    if (busy) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const p = { uri: a.uri, mime: a.mimeType ?? "image/jpeg", key: mint() };
    setPending(p);
    upload(p);
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never" refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: contentTop, paddingBottom: bottom + space.s24 }]}>
        <View style={s.head}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Memories</Text>
          <Text maxFontSizeMultiplier={1.4} style={s.body}>Photos and notes from the trip, shared with everyone on it.</Text>
        </View>

        <View style={s.add}>
          <PrimaryButton label={busy && pending ? "Uploading…" : "Add a photo"} onPress={pickPhoto} />
          {linking ? (
            <View style={s.linkBox}>
              <TextField label="Google Photos link" placeholder="Paste a shared album or photo link" value={link} onChangeText={(v) => { setLink(v); setLinkError(null); }}
                autoCapitalize="none" autoCorrect={false} keyboardType="url" status={linkError ? "error" : undefined} message={linkError ?? undefined} />
              <Button label={busy ? "Adding link…" : "Add link"} type={link.trim() ? "primary" : "secondaryNeutral"} size="large" onPress={saveLink} />
              <TextButton label="Cancel" onPress={() => { setLinking(false); setLink(""); setLinkError(null); }} />
            </View>
          ) : (
            <Button label="Add a Google Photos link" type="secondaryNeutral" size="large" onPress={() => setLinking(true)} />
          )}
          <TextField label="Note" placeholder="A note about the trip" value={note} onChangeText={setNote} multiline />
          <Button label={busy && !pending ? "Saving…" : "Add note"} type="secondaryNeutral" size="large" onPress={saveNote} />
        </View>
        {error && (
          <View style={s.gap}>
            <Alert variant="negative">{error}</Alert>
            {pending && <TextButton label="Retry upload" onPress={() => upload(pending)} />}
          </View>
        )}
        <View style={s.divider} />
        {state === null ? (
          <Skeleton label="Loading memories" variant="memories" />
        ) : !state.ok ? (
          <View style={s.gap}>
            <Alert variant="negative" persist>{state.message}</Alert>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : state.memories.length === 0 ? (
          <Text maxFontSizeMultiplier={1.4} style={s.body}>No memories yet. Add a photo or a note to hold on to this trip.</Text>
        ) : (
          state.memories.map((m) => (
            <View key={m.id} style={s.memory}>
              {m.canManage && (
                <Pressable accessibilityRole="button" accessibilityLabel={`Options for this ${m.type === "link" ? "link" : m.type === "photo" ? "photo" : "note"}`} hitSlop={space.s8} onPress={() => setMenu(m)} style={s.more}>
                  <MoreHorizontal size={18} color={color.iconInk} strokeWidth={2} />
                </Pressable>
              )}
              {m.type === "link" && m.linkUrl && (
                <Pressable accessibilityRole="link" accessibilityLabel={`${m.linkTitle ?? "Google Photos"}, opens in Google Photos`} dip={false} onPress={() => Linking.openURL(m.linkUrl!)} style={s.linkCard}>
                  <View style={s.linkPicture}>
                    {m.linkImage ? <Image accessibilityIgnoresInvertColors source={{ uri: m.linkImage }} style={s.fill} /> : <Images size={40} color={color.slate} strokeWidth={1.5} />}
                    <View style={s.linkBadge}><Text maxFontSizeMultiplier={1.2} style={s.linkBadgeText}>Google Photos</Text></View>
                  </View>
                  <View style={s.linkText}>
                    <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={s.linkTitle}>{m.linkTitle ?? "Photos on Google Photos"}</Text>
                    <View style={s.linkOpen}><Text maxFontSizeMultiplier={1.4} style={s.meta}>Open in Google Photos</Text><ExternalLink size={14} color={color.charcoal} strokeWidth={1.75} /></View>
                  </View>
                </Pressable>
              )}
              {m.photoUrl && <Image accessibilityIgnoresInvertColors source={{ uri: m.photoUrl }} style={s.photo} />}
              {(m.body || m.caption) && (
                <View style={[s.text, m.canManage && s.textClear]}>
                  {m.body && <Text maxFontSizeMultiplier={1.4} style={s.line}>{m.body}</Text>}
                  {m.caption && <Text maxFontSizeMultiplier={1.4} style={s.line}>{m.caption}</Text>}
                </View>
              )}
              <View style={s.byline}>
                <Avatar name={m.author} size={24} />
                <Text maxFontSizeMultiplier={1.4} style={s.meta}>{m.author} · {formatDate(toIso(new Date(m.created_at)))}</Text>
              </View>
            </View>
          ))
        )}
      </Animated.ScrollView>
      <BottomSheet visible={!!menu} onClose={() => setMenu(null)} onClosed={() => { const next = after.current; after.current = null; next?.(); }} title="Options">
        <SheetRows>
          {menu?.type === "note" && <ListItem title="Edit note" leading={<View style={s.icon}><Pencil size={22} color={color.iconInk} strokeWidth={1.75} /></View>} trailing="chevron" onPress={() => startEdit(menu)} />}
          {menu && <ListItem title="Delete" subtitle="Removes it for everyone on the trip" leading={<View style={s.icon}><Trash2 size={22} color={color.alarmRed} strokeWidth={1.75} /></View>} trailing="chevron" onPress={() => startDelete(menu)} />}
        </SheetRows>
      </BottomSheet>
      <BottomSheet visible={!!editing} onClose={() => setEditing(null)} title="Edit note" actionLabel={actionBusy ? "Saving…" : "Save changes"} onAction={saveEdit} actionBusy={actionBusy} actionDisabled={!draft.trim()}>
        <View style={s.gap}>
          <TextField label="Note" value={draft} onChangeText={(v) => { setDraft(v); setActionError(null); }} multiline autoCapitalize="sentences" status={actionError ? "error" : undefined} message={actionError ?? undefined} />
        </View>
      </BottomSheet>
      <Dialog visible={!!deleting} onClose={() => setDeleting(null)} title="Delete this memory?" subheader="It's removed for everyone on the trip"
        body={actionError ?? (deleting?.type === "photo" ? "The photo will no longer show in Memories." : deleting?.type === "link" ? "The link will no longer show in Memories. The album in Google Photos is not affected." : "The note will no longer show in Memories.")}
        actionLabel={actionBusy ? "Deleting…" : "Delete"} actionType="destructive" onAction={confirmDelete} actionBusy={actionBusy}
        secondaryLabel="Keep" onSecondary={() => setDeleting(null)} />
      <PinnedBack onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} scrollY={scrollY} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  head: { gap: space.s8, marginTop: space.s8 },
  heading: { ...type.pageTitle, color: color.brandBlack },
  divider: { height: 1, backgroundColor: color.borderNeutral, marginVertical: space.s8 },
  gap: { gap: space.s8 },
  add: { gap: space.s12 },
  more: { position: "absolute", top: space.s12, right: space.s12, zIndex: 1, width: 36, height: 36, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  icon: { width: 44, height: 44, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center" },
  memory: { gap: space.s12, padding: space.s8, borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: color.softGrey },
  linkBox: { gap: space.s12 },
  linkCard: { borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", backgroundColor: color.paper },
  linkPicture: { width: "100%", aspectRatio: 16 / 9, alignItems: "center", justifyContent: "center", backgroundColor: color.neutralWash },
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  linkBadge: { position: "absolute", left: space.s8, bottom: space.s8, paddingHorizontal: space.s8, paddingVertical: space.s4, borderRadius: radius.pill, backgroundColor: color.paper },
  linkBadgeText: { ...type.fieldMessage, fontSize: 12, lineHeight: 16, color: color.obsidian },
  linkText: { gap: space.s4, padding: space.s12 },
  linkTitle: { ...type.label, color: color.obsidian },
  linkOpen: { flexDirection: "row", alignItems: "center", gap: space.s4 },
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: color.neutralSolid },
  textClear: { paddingRight: 52 },   // clear of the options button
  text: { gap: space.s8, paddingHorizontal: space.s12, paddingTop: space.s4 },
  byline: { flexDirection: "row", alignItems: "center", gap: space.s8, paddingHorizontal: space.s12, paddingBottom: space.s12 },
  line: { ...type.fieldValue, color: color.obsidian },
  meta: { ...type.fieldMessage, color: color.charcoal },
  body: { ...type.fieldValue, color: color.charcoal },
});
