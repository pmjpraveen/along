import { Alert } from "../../../src/components/Alert";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { Card } from "../../../src/components/Card";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addNote, addPhoto, listMemories, MemoriesResult } from "../../../src/api/memories";
import { OutlinedButton, PrimaryButton, TextButton } from "../../../src/components/Buttons";
import { TextField } from "../../../src/components/TextField";
import { formatDate, toIso } from "../../../src/domain/trip";
import { color, radius, space, type } from "../../../src/theme/tokens";

const mint = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Photos and notes for this trip. Each attempt keeps its key until it succeeds, so a retry saves one memory, not two.
export default function Memories() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
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
      <ScrollView keyboardShouldPersistTaps="handled" refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Memories</Text>
        <PrimaryButton label={busy && pending ? "Uploading…" : "Add a photo"} onPress={pickPhoto} />
        <TextField label="Note" placeholder="A note about the trip" value={note} onChangeText={setNote} multiline />
        <OutlinedButton label={busy && !pending ? "Saving…" : "Add note"} onPress={saveNote} />
        {error && (
          <View style={s.gap}>
            <Alert variant="negative">{error}</Alert>
            {pending && <TextButton label="Retry upload" onPress={() => upload(pending)} />}
          </View>
        )}
        {state === null ? (
          <ActivityIndicator accessibilityLabel="Loading memories" color={color.forestInk} />
        ) : !state.ok ? (
          <View style={s.gap}>
            <Alert variant="negative">{state.message}</Alert>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : state.memories.length === 0 ? (
          <Text maxFontSizeMultiplier={1.4} style={s.body}>No memories yet. Add a photo or a note to keep the feeling of this trip.</Text>
        ) : (
          state.memories.map((m) => (
            <Card key={m.id} accessible>
              {m.photoUrl && <Image accessibilityIgnoresInvertColors source={{ uri: m.photoUrl }} style={s.photo} />}
              {m.body && <Text maxFontSizeMultiplier={1.4} style={s.line}>{m.body}</Text>}
              {m.caption && <Text maxFontSizeMultiplier={1.4} style={s.line}>{m.caption}</Text>}
              <Text maxFontSizeMultiplier={1.4} style={s.meta}>{m.author} · {formatDate(toIso(new Date(m.created_at)))}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s12 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  gap: { gap: space.s8 },
  input: { minHeight: 96, padding: space.s16, textAlignVertical: "top", borderRadius: radius.input, borderWidth: 1.5, borderColor: color.borderNeutral, ...type.body, color: color.obsidian },
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.input, backgroundColor: color.neutralWash },
  line: { ...type.body, color: color.obsidian },
  meta: { ...type.label, color: color.charcoal },
  body: { ...type.body, color: color.charcoal },
  error: { ...type.label, color: color.alarmRed },
});
