# Phase N3: Musical Numbers + Scenes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Show Hub, Musical Numbers (list + detail + notes), and Scenes (list with active/grayed styling + detail + user-in-scene toggle + notes) — every row-based (non-media) feature from the web app ported to native.

**Architecture:** Reuse the service / hook / route patterns established in Phase N2. Two new entities (`musical_numbers`, `scenes`) with symmetrical CRUD. Detail screens use debounced autosave for notes (similar to the web PWA's UX). No media yet.

**Tech Stack:** Same as N2. No new deps.

**Spec:** `docs/superpowers/specs/2026-04-19-react-native-expo-migration-design.md`
**Prior plans (must be complete):** N1 (`phase-n1-complete`), N2 (`phase-n2-complete`).

---

## File Structure

```
src/
├── lib/types.ts              # MODIFIED: add MusicalNumber, Scene types
└── services/
    ├── musicalNumberService.ts  # NEW
    └── sceneService.ts          # NEW
app/(app)/shows/[showId]/
├── _layout.tsx                # NEW: stack for show-scoped screens
├── index.tsx                  # NEW: Show Hub
├── musical-numbers/
│   ├── index.tsx              # NEW: list
│   ├── new.tsx                # NEW: add modal
│   └── [numberId].tsx         # NEW: detail (notes)
└── scenes/
    ├── index.tsx              # NEW: list (active/grayed)
    ├── new.tsx                # NEW: add modal
    └── [sceneId].tsx          # NEW: detail
__tests__/
├── musicalNumberService.test.tsx  # NEW
└── sceneService.test.tsx          # NEW
```

---

## Task 1: Add row types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Append to types.ts**

```ts
export type MusicalNumber = {
  id: string;
  user_id: string;
  show_id: string;
  name: string;
  order: number;
  notes: string;
  created_at: string;
};

export type NewMusicalNumber = Pick<MusicalNumber, "show_id" | "name" | "order">;
export type MusicalNumberUpdate = Partial<Pick<MusicalNumber, "name" | "order" | "notes">>;

export type Scene = {
  id: string;
  user_id: string;
  show_id: string;
  name: string;
  order: number;
  is_user_in_scene: boolean;
  notes: string;
  created_at: string;
};

export type NewScene = Pick<Scene, "show_id" | "name" | "order"> &
  Partial<Pick<Scene, "is_user_in_scene">>;
export type SceneUpdate = Partial<Pick<Scene, "name" | "order" | "is_user_in_scene" | "notes">>;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add MusicalNumber and Scene row shapes"
```

---

## Task 2: `musicalNumberService` (TDD)

**Files:**
- Create: `src/services/musicalNumberService.ts`
- Test: `__tests__/musicalNumberService.test.tsx`

The shape mirrors `showService` from N2 — list (scoped by show), detail, create, update, delete — with `"musical-numbers"` query keys.

- [ ] **Step 1: Write failing test**

```tsx
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import {
  useMusicalNumbers, useMusicalNumber,
  useCreateMusicalNumber, useUpdateMusicalNumber, useDeleteMusicalNumber,
} from "@/services/musicalNumberService";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));

function wrap(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return ({ children }: any) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("musicalNumberService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("useMusicalNumbers queries by show_id", async () => {
    const order = jest.fn().mockResolvedValue({ data: [{ id: "m1" }], error: null });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useMusicalNumbers("s1"), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(supabase.from).toHaveBeenCalledWith("musical_numbers");
    expect(eq).toHaveBeenCalledWith("show_id", "s1");
  });

  test("useMusicalNumber queries by id", async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: "m1" }, error: null });
    const eq = jest.fn().mockReturnValue({ single });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });
    const { result } = renderHook(() => useMusicalNumber("m1"), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eq).toHaveBeenCalledWith("id", "m1");
  });

  test("useCreateMusicalNumber inserts and invalidates", async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: "m2" }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateMusicalNumber(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ show_id: "s1", name: "Act 1", order: 0 });
    });
    expect(insert).toHaveBeenCalledWith({ show_id: "s1", name: "Act 1", order: 0 });
    expect(invalidate).toHaveBeenCalled();
  });

  test("useUpdateMusicalNumber patches by id", async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: "m1" }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const { result } = renderHook(() => useUpdateMusicalNumber(), { wrapper: wrap() });
    await act(async () => {
      await result.current.mutateAsync({ id: "m1", patch: { notes: "bridge in D" } });
    });
    expect(update).toHaveBeenCalledWith({ notes: "bridge in D" });
  });

  test("useDeleteMusicalNumber deletes", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const { result } = renderHook(() => useDeleteMusicalNumber(), { wrapper: wrap() });
    await act(async () => { await result.current.mutateAsync("m1"); });
    expect(eq).toHaveBeenCalledWith("id", "m1");
  });
});
```

- [ ] **Step 2: Watch it fail**

Run: `npm test -- musicalNumberService`

- [ ] **Step 3: Implement**

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { MusicalNumber, NewMusicalNumber, MusicalNumberUpdate } from "@/lib/types";

export const mnKeys = {
  all: ["musical-numbers"] as const,
  list: (showId: string) => [...mnKeys.all, "list", showId] as const,
  detail: (id: string) => [...mnKeys.all, "detail", id] as const,
};

export function useMusicalNumbers(showId: string | undefined) {
  return useQuery({
    queryKey: showId ? mnKeys.list(showId) : [...mnKeys.all, "list", "nil"],
    enabled: !!showId,
    queryFn: async (): Promise<MusicalNumber[]> => {
      const { data, error } = await supabase
        .from("musical_numbers").select("*").eq("show_id", showId!)
        .order("order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MusicalNumber[];
    },
  });
}

export function useMusicalNumber(id: string | undefined) {
  return useQuery({
    queryKey: id ? mnKeys.detail(id) : [...mnKeys.all, "detail", "nil"],
    enabled: !!id,
    queryFn: async (): Promise<MusicalNumber> => {
      const { data, error } = await supabase
        .from("musical_numbers").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as MusicalNumber;
    },
  });
}

export function useCreateMusicalNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewMusicalNumber): Promise<MusicalNumber> => {
      const { data, error } = await supabase
        .from("musical_numbers").insert(input).select().single();
      if (error) throw error;
      return data as MusicalNumber;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: mnKeys.list(vars.show_id) }),
  });
}

export function useUpdateMusicalNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: MusicalNumberUpdate }) => {
      const { data, error } = await supabase
        .from("musical_numbers").update(input.patch).eq("id", input.id).select().single();
      if (error) throw error;
      return data as MusicalNumber;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: mnKeys.detail(data.id) });
      qc.invalidateQueries({ queryKey: mnKeys.list(data.show_id) });
    },
  });
}

export function useDeleteMusicalNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("musical_numbers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mnKeys.all }),
  });
}
```

- [ ] **Step 4: Watch it pass**

Run: `npm test -- musicalNumberService`

- [ ] **Step 5: Commit**

```bash
git add src/services/musicalNumberService.ts __tests__/musicalNumberService.test.tsx
git commit -m "feat(musical-numbers): add CRUD service"
```

---

## Task 3: `sceneService` (TDD)

Same shape as `musicalNumberService`. Compose the test + implementation analogously.

**Files:**
- Create: `src/services/sceneService.ts`
- Test: `__tests__/sceneService.test.tsx`

- [ ] **Step 1: Write failing test**

Structurally identical to `musicalNumberService.test.tsx` but importing from `@/services/sceneService`, hitting the `scenes` table, and exercising:
- `useScenes(showId)`
- `useScene(id)`
- `useCreateScene({ show_id, name, order })`
- `useUpdateScene({ id, patch })` — confirm it can update `is_user_in_scene` and `notes`
- `useDeleteScene(id)`

Mirror the five tests from Task 2 one-for-one, substituting entity names. Include this additional test:

```tsx
test("useUpdateScene toggles is_user_in_scene", async () => {
  const single = jest.fn().mockResolvedValue({ data: { id: "sc1" }, error: null });
  const select = jest.fn().mockReturnValue({ single });
  const eq = jest.fn().mockReturnValue({ select });
  const update = jest.fn().mockReturnValue({ eq });
  (supabase.from as jest.Mock).mockReturnValue({ update });

  const { result } = renderHook(() => useUpdateScene(), { wrapper: wrap() });
  await act(async () => {
    await result.current.mutateAsync({ id: "sc1", patch: { is_user_in_scene: true } });
  });
  expect(update).toHaveBeenCalledWith({ is_user_in_scene: true });
});
```

- [ ] **Step 2: Watch fail, implement, watch pass, commit**

Implementation matches `musicalNumberService` with these substitutions:
- `mnKeys` → `sceneKeys`
- `"musical_numbers"` → `"scenes"`
- Types: `Scene`, `NewScene`, `SceneUpdate`
- Key root: `["scenes"]`
- Order by `"order" ascending`

```bash
git add src/services/sceneService.ts __tests__/sceneService.test.tsx
git commit -m "feat(scenes): add CRUD service"
```

---

## Task 4: Show-scoped stack layout

**Files:**
- Create: `app/(app)/shows/[showId]/_layout.tsx`

- [ ] **Step 1: Implement**

```tsx
import { Stack } from "expo-router";

export default function ShowLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "" }} />
      <Stack.Screen name="musical-numbers/index" options={{ title: "Musical Numbers" }} />
      <Stack.Screen name="musical-numbers/new" options={{ presentation: "modal", title: "New Musical Number" }} />
      <Stack.Screen name="musical-numbers/[numberId]" options={{ title: "" }} />
      <Stack.Screen name="scenes/index" options={{ title: "Scenes" }} />
      <Stack.Screen name="scenes/new" options={{ presentation: "modal", title: "New Scene" }} />
      <Stack.Screen name="scenes/[sceneId]" options={{ title: "" }} />
    </Stack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/shows/[showId]/_layout.tsx"
git commit -m "feat(routes): add show-scoped stack layout"
```

---

## Task 5: Show Hub

**Files:**
- Create: `app/(app)/shows/[showId]/index.tsx`

- [ ] **Step 1: Implement**

```tsx
import { Link, useLocalSearchParams, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useShow } from "@/services/showService";

export default function ShowHub() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const { data: show, isLoading } = useShow(showId);

  if (isLoading && !show) return <View style={styles.center}><ActivityIndicator /></View>;
  if (!show) return <View style={styles.center}><Text>Show not found.</Text></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: show.name }} />
      <Text style={styles.title}>{show.name}</Text>
      <Link href={`/(app)/shows/${show.id}/musical-numbers`} style={styles.tile}>
        <Text style={styles.tileText}>Musical Numbers</Text>
      </Link>
      <Link href={`/(app)/shows/${show.id}/scenes`} style={styles.tile}>
        <Text style={styles.tileText}>Scenes</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 16 },
  tile: {
    padding: 20, backgroundColor: "#fff", borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: "#ddd",
  },
  tileText: { fontSize: 18, fontWeight: "500" },
});
```

- [ ] **Step 2: Smoke-test**

Tap a show on Home → lands on Show Hub with tiles.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/shows/[showId]/index.tsx"
git commit -m "feat(shows): show hub screen"
```

---

## Task 6: Musical Numbers list

**Files:**
- Create: `app/(app)/shows/[showId]/musical-numbers/index.tsx`

- [ ] **Step 1: Implement**

```tsx
import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useMusicalNumbers, useDeleteMusicalNumber } from "@/services/musicalNumberService";

export default function MusicalNumbers() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useMusicalNumbers(showId);
  const del = useDeleteMusicalNumber();

  if (isLoading && !data) return <View style={styles.center}><ActivityIndicator /></View>;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data ?? []}
        keyExtractor={(m) => m.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<View style={styles.empty}><Text>No musical numbers yet.</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Link href={`/(app)/shows/${showId}/musical-numbers/${item.id}`} style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
            </Link>
            <Pressable onPress={() => del.mutate(item.id)}>
              <Text style={{ color: "#FF3B30" }}>Delete</Text>
            </Pressable>
          </View>
        )}
      />
      <Pressable
        style={styles.fab}
        onPress={() => router.push(`/(app)/shows/${showId}/musical-numbers/new`)}
        accessibilityLabel="Add musical number"
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: 32, alignItems: "center" },
  card: {
    flexDirection: "row", alignItems: "center", padding: 16,
    backgroundColor: "#fff", borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "#ddd",
  },
  name: { fontSize: 17, fontWeight: "500" },
  fab: {
    position: "absolute", right: 20, bottom: 32, width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#007AFF", alignItems: "center", justifyContent: "center",
  },
  fabPlus: { color: "#fff", fontSize: 32, lineHeight: 32 },
});
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/shows/[showId]/musical-numbers/index.tsx"
git commit -m "feat(musical-numbers): list screen"
```

---

## Task 7: Musical Number add modal

**Files:**
- Create: `app/(app)/shows/[showId]/musical-numbers/new.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCreateMusicalNumber, useMusicalNumbers } from "@/services/musicalNumberService";

export default function NewMusicalNumber() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const router = useRouter();
  const create = useCreateMusicalNumber();
  const { data: existing } = useMusicalNumbers(showId);
  const [name, setName] = useState("");

  async function onSave() {
    const trimmed = name.trim();
    if (!trimmed || !showId) return;
    const nextOrder = (existing?.length ?? 0);
    try {
      await create.mutateAsync({ show_id: showId, name: trimmed, order: nextOrder });
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't add", e?.message ?? String(e));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name} onChangeText={setName}
        placeholder="Seasons of Love"
        autoFocus style={styles.input}
        returnKeyType="done" onSubmitEditing={onSave}
      />
      <View style={styles.row}>
        <Pressable style={styles.cancel} onPress={() => router.back()}><Text>Cancel</Text></Pressable>
        <Pressable style={styles.save} onPress={onSave} disabled={create.isPending}>
          <Text style={styles.saveText}>{create.isPending ? "Saving…" : "Save"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  label: { fontSize: 14, color: "#666" },
  input: { fontSize: 18, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "#ccc", borderRadius: 8 },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16 },
  cancel: { padding: 12 },
  save: { padding: 12, backgroundColor: "#007AFF", borderRadius: 8, paddingHorizontal: 20 },
  saveText: { color: "#fff", fontWeight: "600" },
});
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/shows/[showId]/musical-numbers/new.tsx"
git commit -m "feat(musical-numbers): add-new modal"
```

---

## Task 8: Musical Number detail with notes autosave

**Files:**
- Create: `app/(app)/shows/[showId]/musical-numbers/[numberId].tsx`
- Create: `src/hooks/useDebouncedSave.ts`

- [ ] **Step 1: Create the debounced-save hook**

```ts
// src/hooks/useDebouncedSave.ts
import { useEffect, useRef } from "react";

export function useDebouncedSave<T>(value: T, delayMs: number, save: (value: T) => void, enabled = true) {
  const first = useRef(true);
  useEffect(() => {
    if (!enabled) return;
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => save(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs, save, enabled]);
}
```

- [ ] **Step 2: Implement the detail screen**

```tsx
// app/(app)/shows/[showId]/musical-numbers/[numberId].tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMusicalNumber, useUpdateMusicalNumber } from "@/services/musicalNumberService";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";

export default function MusicalNumberDetail() {
  const { numberId } = useLocalSearchParams<{ numberId: string }>();
  const { data, isLoading } = useMusicalNumber(numberId);
  const update = useUpdateMusicalNumber();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (data && !hydrated) {
      setName(data.name);
      setNotes(data.notes);
      setHydrated(true);
    }
  }, [data, hydrated]);

  useDebouncedSave(
    { name, notes },
    800,
    ({ name, notes }) => {
      if (!data) return;
      if (name === data.name && notes === data.notes) return;
      update.mutate({ id: data.id, patch: { name, notes } });
    },
    hydrated,
  );

  if (isLoading && !data) return <View style={styles.center}><ActivityIndicator /></View>;
  if (!data) return <View style={styles.center}><Text>Not found.</Text></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: name || "Musical Number" }} />
      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      <Text style={styles.label}>Notes</Text>
      <TextInput
        value={notes} onChangeText={setNotes}
        multiline placeholder="Tempo, cues, reminders…"
        style={[styles.input, styles.notes]}
      />
      <Text style={styles.saved}>
        {update.isPending ? "Saving…" : update.isError ? "Offline — will retry when you edit." : "Saved"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14, color: "#666" },
  input: {
    fontSize: 16, padding: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: "#ccc", borderRadius: 8,
    backgroundColor: "#fff",
  },
  notes: { minHeight: 200, textAlignVertical: "top" },
  saved: { fontSize: 12, color: "#999", marginTop: 4 },
});
```

- [ ] **Step 3: Smoke-test**

Add a musical number, open it, type notes, wait ~1 second, back out and re-enter — notes persist. Airplane-mode: type something, see "Offline" message.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/shows/[showId]/musical-numbers/[numberId].tsx" src/hooks/useDebouncedSave.ts
git commit -m "feat(musical-numbers): detail with debounced autosave"
```

---

## Task 9: Scenes list with active/grayed styling

**Files:**
- Create: `app/(app)/shows/[showId]/scenes/index.tsx`

- [ ] **Step 1: Implement**

```tsx
import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useScenes, useDeleteScene } from "@/services/sceneService";

export default function Scenes() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const router = useRouter();
  const { data, isLoading } = useScenes(showId);
  const del = useDeleteScene();

  if (isLoading && !data) return <View style={styles.center}><ActivityIndicator /></View>;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<View style={styles.empty}><Text>No scenes yet.</Text></View>}
        renderItem={({ item }) => {
          const grayed = !item.is_user_in_scene;
          return (
            <View style={[styles.card, grayed && styles.grayed]}>
              <Link href={`/(app)/shows/${showId}/scenes/${item.id}`} style={{ flex: 1 }}>
                <Text style={[styles.name, grayed && { color: "#999" }]}>{item.name}</Text>
              </Link>
              <Pressable onPress={() => del.mutate(item.id)}>
                <Text style={{ color: "#FF3B30" }}>Delete</Text>
              </Pressable>
            </View>
          );
        }}
      />
      <Pressable
        style={styles.fab}
        onPress={() => router.push(`/(app)/shows/${showId}/scenes/new`)}
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: 32, alignItems: "center" },
  card: {
    flexDirection: "row", alignItems: "center", padding: 16,
    backgroundColor: "#fff", borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "#ddd",
  },
  grayed: { backgroundColor: "#f5f5f5" },
  name: { fontSize: 17, fontWeight: "500" },
  fab: {
    position: "absolute", right: 20, bottom: 32, width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#007AFF", alignItems: "center", justifyContent: "center",
  },
  fabPlus: { color: "#fff", fontSize: 32, lineHeight: 32 },
});
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/shows/[showId]/scenes/index.tsx"
git commit -m "feat(scenes): list with active/grayed styling"
```

---

## Task 10: Scenes add modal + detail

**Files:**
- Create: `app/(app)/shows/[showId]/scenes/new.tsx`
- Create: `app/(app)/shows/[showId]/scenes/[sceneId].tsx`

- [ ] **Step 1: Add modal**

Structurally identical to `musical-numbers/new.tsx`; swap `useCreateMusicalNumber` for `useCreateScene`, `useMusicalNumbers` for `useScenes`, and route segments. Keep the same props: name input, saves with `order = existing?.length ?? 0`, `is_user_in_scene: false` by default.

- [ ] **Step 2: Detail screen**

```tsx
// app/(app)/shows/[showId]/scenes/[sceneId].tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useScene, useUpdateScene } from "@/services/sceneService";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";

export default function SceneDetail() {
  const { sceneId } = useLocalSearchParams<{ sceneId: string }>();
  const { data, isLoading } = useScene(sceneId);
  const update = useUpdateScene();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [inScene, setInScene] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (data && !hydrated) {
      setName(data.name);
      setNotes(data.notes);
      setInScene(data.is_user_in_scene);
      setHydrated(true);
    }
  }, [data, hydrated]);

  useDebouncedSave(
    { name, notes, is_user_in_scene: inScene },
    800,
    (patch) => {
      if (!data) return;
      if (patch.name === data.name && patch.notes === data.notes && patch.is_user_in_scene === data.is_user_in_scene) return;
      update.mutate({ id: data.id, patch });
    },
    hydrated,
  );

  if (isLoading && !data) return <View style={styles.center}><ActivityIndicator /></View>;
  if (!data) return <View style={styles.center}><Text>Not found.</Text></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: name || "Scene" }} />
      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      <View style={styles.row}>
        <Text style={styles.label}>I'm in this scene</Text>
        <Switch value={inScene} onValueChange={setInScene} />
      </View>
      <Text style={styles.label}>Notes</Text>
      <TextInput value={notes} onChangeText={setNotes} multiline style={[styles.input, styles.notes]} />
      <Text style={styles.saved}>
        {update.isPending ? "Saving…" : update.isError ? "Offline — will retry when you edit." : "Saved"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14, color: "#666" },
  input: {
    fontSize: 16, padding: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: "#ccc", borderRadius: 8,
    backgroundColor: "#fff",
  },
  notes: { minHeight: 200, textAlignVertical: "top" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 8 },
  saved: { fontSize: 12, color: "#999", marginTop: 4 },
});
```

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/shows/[showId]/scenes/new.tsx" "app/(app)/shows/[showId]/scenes/[sceneId].tsx"
git commit -m "feat(scenes): add modal and detail with user-in-scene toggle"
```

---

## Task 11: Acceptance pass

- [ ] **Step 1: `npm test`** — all tests pass.
- [ ] **Step 2: Manual walkthrough.** Create show → open Show Hub → add musical number → open it → type notes, wait 1s, back out, re-enter → notes persist. Repeat for scenes; toggle "I'm in scene" and verify the list grays the others.
- [ ] **Step 3: Offline-read.** Populate a show, kill app, airplane mode, reopen → everything still renders.
- [ ] **Step 4: Tag.**

```bash
git tag phase-n3-complete
```

---

## Self-Review

- **Spec coverage:** Show Hub, MN list + add + detail + notes, Scenes list + add + detail + toggle + notes, active/grayed rendering — all covered.
- **Placeholder scan:** Task 3 (sceneService) and Task 10 (scenes/new) describe mirroring an earlier task rather than repeating code. The earlier task is referenced with explicit names/keys so the implementer knows exactly what to change; acceptable but watch for drift during implementation — if you diverge from the MN version, update tests to match.
- **Type consistency:** Keys `mnKeys` / `sceneKeys` follow N2's `showKeys` shape; `useUpdateMusicalNumber` / `useUpdateScene` take `{ id, patch }`.

---

## Next plan

After `phase-n3-complete`, write `YYYY-MM-DD-phase-n4-audio-harmonies.md` — the first media phase.
