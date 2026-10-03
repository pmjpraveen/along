import { Alert } from "../../../src/components/Alert";
import { Skeleton } from "../../../src/components/Skeleton";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { Avatar } from "../../../src/components/Avatar";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addNote, addPhoto, listMemories, MemoriesResult } from "../../../src/api/memories";
import { Button, PrimaryButton, TextButton } from "../../../src/components/Buttons";
import { TextField } from "../../../src/components/TextField";
import { formatDate, toIso } from "../../../src/domain/trip";
import { color, radius, space, type } from "../../../src/theme/tokens";

const mint = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Photos and notes for this trip. Each attempt keeps its key until it succeeds, so a retry saves one memory, not two.
export default function Memories() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<MemoriesResult | null>(null);
  const [note, setNote] = useState("");
  const noteKey = useRef(mint());
  const [pending, setPending] = useState<{ uri: string; mime: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => setState(await listMemories(id)), [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);

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
      <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never" refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s16, paddingBottom: bottom + space.s24 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={space.s4} style={s.round}>
          <ChevronLeft size={22} color={color.brandBlack} strokeWidth={1.75} />
        </Pressable>
        <View style={s.head}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Memories</Text>
          <Text maxFontSizeMultiplier={1.4} style={s.body}>Photos and notes from the trip, shared with everyone on it.</Text>
        </View>

        <View style={s.add}>
          <PrimaryButton label={busy && pending ? "Uploading…" : "Add a photo"} onPress={pickPhoto} />
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
            <View key={m.id} accessible style={s.memory}>
              {m.photoUrl && <Image accessibilityIgnoresInvertColors source={{ uri: m.photoUrl }} style={s.photo} />}
              {(m.body || m.caption) && (
                <View style={s.text}>
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
      </ScrollView>
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
  memory: { gap: space.s12, padding: space.s8, borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: color.softGrey },
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: color.neutralSolid },
  text: { gap: space.s8, paddingHorizontal: space.s12, paddingTop: space.s4 },
  byline: { flexDirection: "row", alignItems: "center", gap: space.s8, paddingHorizontal: space.s12, paddingBottom: space.s12 },
  line: { ...type.fieldValue, color: color.obsidian },
  meta: { ...type.fieldMessage, color: color.charcoal },
  body: { ...type.fieldValue, color: color.charcoal },
});
