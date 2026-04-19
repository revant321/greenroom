# Phase N2: Data Foundation + Shows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the full Supabase schema + RLS, wire a TanStack Query + SQLite persister for read-through caching, and ship a working shows CRUD on the Home and Completed screens — proving end-to-end that data round-trips between device and cloud with per-user isolation.

**Architecture:** A single `supabase-js` client talks to Postgres via PostgREST. TanStack Query owns the read path; a custom async-storage persister backed by `expo-sqlite` serializes the query cache on change and rehydrates at launch so offline reads are free. Mutations call Supabase directly and invalidate relevant query keys on success.

**Tech Stack:** `@tanstack/react-query`, `@tanstack/query-async-storage-persister`, `@tanstack/react-query-persist-client`, `expo-sqlite`, Supabase Postgres migrations.

**Spec:** `docs/superpowers/specs/2026-04-19-react-native-expo-migration-design.md`
**Prior plan (must be complete):** `docs/superpowers/plans/2026-04-19-phase-n1-scaffold-and-auth.md` (tag `phase-n1-complete`).

**Note:** This plan was written before Phase N1 implementation. If N1 produces file layouts or naming that diverges from the assumptions below (e.g., `src/hooks/useAuth.tsx` path), reconcile before starting.

**Prereqs (non-code, user-owned):**
- Supabase project from N1 still accessible with sufficient privileges to run DDL.
- `supabase` CLI installed locally OR willingness to paste SQL into the Supabase Dashboard SQL editor.

---

## File Structure

Files added by this phase:

```
supabase/
└── migrations/
    └── 20260419000001_init_schema.sql
src/
├── db/
│   ├── sqlite.ts             # DB handle + pragmas
│   └── kvStore.ts            # key/value storage used by the persister
├── lib/
│   ├── queryClient.ts        # QueryClient + persister wiring
│   └── types.ts              # generated + hand-typed row shapes
└── services/
    └── showService.ts        # useShows, useShow, useCreateShow, useUpdateShow, useCompleteShow, useDeleteShow
app/
├── _layout.tsx               # MODIFIED: wrap in QueryClientProvider + PersistQueryClientProvider
├── (app)/
│   ├── index.tsx             # MODIFIED: active shows list
│   ├── completed.tsx         # NEW
│   └── shows/
│       └── new.tsx           # NEW: add-show modal route
__tests__/
├── kvStore.test.ts
├── queryClient.test.ts
└── showService.test.tsx
```

---

## Task 1: Write the Supabase schema migration

**Files:**
- Create: `supabase/migrations/20260419000001_init_schema.sql`

The full schema covers tables for all features (N2–N7). Writing it once now is cheaper than stacking migrations across phases; later phases only add columns or storage buckets.

- [ ] **Step 1: Create the migration file**

```sql
-- 20260419000001_init_schema.sql

-- Shows
create table shows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  roles jsonb not null default '[]'::jsonb,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index shows_user_idx on shows(user_id);

-- Musical numbers
create table musical_numbers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  show_id uuid not null references shows(id) on delete cascade,
  name text not null,
  "order" integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index musical_numbers_show_idx on musical_numbers(show_id);

-- Harmonies
create table harmonies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  musical_number_id uuid not null references musical_numbers(id) on delete cascade,
  storage_path text not null,
  measure_number integer,
  caption text not null default '',
  created_at timestamptz not null default now()
);
create index harmonies_mn_idx on harmonies(musical_number_id);

-- Scenes
create table scenes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  show_id uuid not null references shows(id) on delete cascade,
  name text not null,
  "order" integer not null default 0,
  is_user_in_scene boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index scenes_show_idx on scenes(show_id);

-- Scene recordings (audio or video)
create table scene_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scene_id uuid not null references scenes(id) on delete cascade,
  kind text not null check (kind in ('audio','video')),
  storage_path text not null,
  caption text not null default '',
  created_at timestamptz not null default now()
);
create index scene_recordings_scene_idx on scene_recordings(scene_id);

-- Dance videos (file OR external url)
create table dance_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  musical_number_id uuid not null references musical_numbers(id) on delete cascade,
  title text not null default '',
  storage_path text,
  external_url text,
  created_at timestamptz not null default now(),
  constraint dance_videos_has_media check (storage_path is not null or external_url is not null)
);
create index dance_videos_mn_idx on dance_videos(musical_number_id);

-- Sheet music (PDF)
create table sheet_music (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  musical_number_id uuid not null references musical_numbers(id) on delete cascade,
  title text not null default '',
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index sheet_music_mn_idx on sheet_music(musical_number_id);

-- Standalone songs
create table songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  is_audition_song boolean not null default false,
  category text check (category in ('vocal','guitar')),
  status text not null default 'in-progress' check (status in ('in-progress','completed')),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index songs_user_idx on songs(user_id);

-- Song parts (audio clips)
create table song_parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  storage_path text not null,
  measure_number integer,
  caption text not null default '',
  created_at timestamptz not null default now()
);
create index song_parts_song_idx on song_parts(song_id);

-- Song tracks (audio, video, or link)
create table song_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  kind text not null check (kind in ('audio','video','link')),
  title text not null default '',
  storage_path text,
  external_url text,
  created_at timestamptz not null default now(),
  constraint song_tracks_has_media check (
    (kind = 'link' and external_url is not null) or
    (kind in ('audio','video') and storage_path is not null)
  )
);
create index song_tracks_song_idx on song_tracks(song_id);

-- Song sheet music (PDF)
create table song_sheet_music (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  title text not null default '',
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index song_sheet_music_song_idx on song_sheet_music(song_id);

-- Row-Level Security
alter table shows enable row level security;
alter table musical_numbers enable row level security;
alter table harmonies enable row level security;
alter table scenes enable row level security;
alter table scene_recordings enable row level security;
alter table dance_videos enable row level security;
alter table sheet_music enable row level security;
alter table songs enable row level security;
alter table song_parts enable row level security;
alter table song_tracks enable row level security;
alter table song_sheet_music enable row level security;

-- Owner-only policies (same shape for every table)
do $$
declare t text;
begin
  for t in select unnest(array[
    'shows','musical_numbers','harmonies','scenes','scene_recordings',
    'dance_videos','sheet_music','songs','song_parts','song_tracks','song_sheet_music'
  ]) loop
    execute format('create policy "%1$s_select_own" on %1$s for select using (user_id = auth.uid())', t);
    execute format('create policy "%1$s_insert_own" on %1$s for insert with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_update_own" on %1$s for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_delete_own" on %1$s for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

-- Media storage bucket (private)
insert into storage.buckets (id, name, public) values ('media','media', false)
  on conflict (id) do nothing;

create policy "media_read_own" on storage.objects for select
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_insert_own" on storage.objects for insert
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_update_own" on storage.objects for update
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_delete_own" on storage.objects for delete
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Apply the migration**

Two paths:

**Via Supabase CLI (preferred):**
```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Via Dashboard:**
Supabase Dashboard → SQL Editor → New query → paste the contents → Run.

- [ ] **Step 3: Verify via Dashboard**

Dashboard → Table Editor: confirm all 11 tables exist, each has RLS enabled (green "RLS" badge), and Storage → `media` bucket exists.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260419000001_init_schema.sql
git commit -m "feat(db): initial schema with RLS and media storage bucket"
```

---

## Task 2: Install data-layer dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
npx expo install expo-sqlite
npm install @tanstack/react-query @tanstack/query-async-storage-persister \
  @tanstack/react-query-persist-client
```

- [ ] **Step 2: Verify**

Run: `npx expo-doctor`
Expected: no warnings.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install TanStack Query and expo-sqlite"
```

---

## Task 3: SQLite DB handle

**Files:**
- Create: `src/db/sqlite.ts`

- [ ] **Step 1: Implement**

```ts
import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync("greenroom.db");
    db.execSync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    db.execSync(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }
  return db;
}
```

The `kv_store` table is the backing for the TanStack Query persister. Later phases will add a `media_cache` table to the same DB.

- [ ] **Step 2: Commit**

```bash
git add src/db/sqlite.ts
git commit -m "feat(db): add expo-sqlite handle with kv_store table"
```

---

## Task 4: Key/value store (TDD)

**Files:**
- Create: `src/db/kvStore.ts`
- Test: `__tests__/kvStore.test.ts`

The persister expects `{ getItem, setItem, removeItem }` with string values. We wrap the `kv_store` SQLite table.

- [ ] **Step 1: Write failing test**

```ts
import { kvStore } from "@/db/kvStore";
import { getDb } from "@/db/sqlite";

jest.mock("@/db/sqlite", () => {
  const rows = new Map<string, string>();
  return {
    getDb: () => ({
      getFirstSync: (_sql: string, key: string) => {
        const v = rows.get(key);
        return v === undefined ? null : { value: v };
      },
      runSync: (sql: string, ...params: any[]) => {
        if (sql.startsWith("INSERT")) rows.set(params[0], params[1]);
        if (sql.startsWith("DELETE")) rows.delete(params[0]);
      },
    }),
  };
});

describe("kvStore", () => {
  test("setItem then getItem returns the value", async () => {
    await kvStore.setItem("a", "1");
    await expect(kvStore.getItem("a")).resolves.toBe("1");
  });

  test("getItem returns null for missing key", async () => {
    await expect(kvStore.getItem("missing")).resolves.toBeNull();
  });

  test("removeItem deletes the key", async () => {
    await kvStore.setItem("b", "2");
    await kvStore.removeItem("b");
    await expect(kvStore.getItem("b")).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Watch it fail**

Run: `npm test -- kvStore`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { getDb } from "./sqlite";

export const kvStore = {
  async getItem(key: string): Promise<string | null> {
    const row = getDb().getFirstSync<{ value: string }>(
      "SELECT value FROM kv_store WHERE key = ?",
      key,
    );
    return row?.value ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    getDb().runSync(
      "INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      key,
      value,
      Date.now(),
    );
  },
  async removeItem(key: string): Promise<void> {
    getDb().runSync("DELETE FROM kv_store WHERE key = ?", key);
  },
};
```

- [ ] **Step 4: Watch it pass**

Run: `npm test -- kvStore`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/db/kvStore.ts __tests__/kvStore.test.ts
git commit -m "feat(db): add kv_store wrapper used by query persister"
```

---

## Task 5: QueryClient + persister wiring

**Files:**
- Create: `src/lib/queryClient.ts`

- [ ] **Step 1: Implement**

```ts
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { kvStore } from "@/db/kvStore";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 60 * 24 * 30, // 30 days — we want cached data to survive offline launches
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: kvStore,
  key: "greenroom-query-cache-v1",
  throttleTime: 1000,
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queryClient.ts
git commit -m "feat: add QueryClient and persister wired to kv_store"
```

---

## Task 6: Wrap root in PersistQueryClientProvider

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Update**

```tsx
import { Stack } from "expo-router";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { AuthProvider } from "@/hooks/useAuth";
import { queryClient, persister } from "@/lib/queryClient";

export default function RootLayout() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: wrap app in PersistQueryClientProvider"
```

---

## Task 7: Row type definitions

**Files:**
- Create: `src/lib/types.ts`

Hand-type the rows this phase needs. Later phases add their types to this file.

- [ ] **Step 1: Create**

```ts
export type Show = {
  id: string;
  user_id: string;
  name: string;
  roles: string[];
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
};

export type NewShow = Pick<Show, "name" | "roles">;
export type ShowUpdate = Partial<Pick<Show, "name" | "roles" | "is_completed" | "completed_at">>;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add hand-typed row shapes"
```

---

## Task 8: `showService` — listing + detail (TDD)

**Files:**
- Create: `src/services/showService.ts`
- Test: `__tests__/showService.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useShows, useShow } from "@/services/showService";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useShows", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns active shows (is_completed = false)", async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: "s1", name: "Rent", is_completed: false }],
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useShows({ completed: false }), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "s1", name: "Rent", is_completed: false }]);
    expect(supabase.from).toHaveBeenCalledWith("shows");
    expect(eq).toHaveBeenCalledWith("is_completed", false);
  });
});

describe("useShow", () => {
  test("returns a single show by id", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "s1", name: "Rent" },
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ single });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { result } = renderHook(() => useShow("s1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "s1", name: "Rent" });
  });
});
```

- [ ] **Step 2: Watch it fail**

Run: `npm test -- showService`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement listing + detail**

```ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Show } from "@/lib/types";

export const showKeys = {
  all: ["shows"] as const,
  list: (completed: boolean) => [...showKeys.all, "list", { completed }] as const,
  detail: (id: string) => [...showKeys.all, "detail", id] as const,
};

export function useShows({ completed }: { completed: boolean }) {
  return useQuery({
    queryKey: showKeys.list(completed),
    queryFn: async (): Promise<Show[]> => {
      const { data, error } = await supabase
        .from("shows")
        .select("*")
        .eq("is_completed", completed)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Show[];
    },
  });
}

export function useShow(id: string | undefined) {
  return useQuery({
    queryKey: id ? showKeys.detail(id) : ["shows", "detail", "nil"],
    enabled: !!id,
    queryFn: async (): Promise<Show> => {
      const { data, error } = await supabase.from("shows").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Show;
    },
  });
}
```

- [ ] **Step 4: Watch tests pass**

Run: `npm test -- showService`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/showService.ts __tests__/showService.test.tsx
git commit -m "feat(shows): add useShows and useShow queries"
```

---

## Task 9: `showService` — create mutation (TDD)

**Files:**
- Modify: `src/services/showService.ts`
- Modify: `__tests__/showService.test.tsx`

- [ ] **Step 1: Add failing test**

Append to the existing test file:
```tsx
import { useCreateShow } from "@/services/showService";
import { act } from "@testing-library/react-native";

describe("useCreateShow", () => {
  test("inserts a show and invalidates the list query", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "s2", name: "Cats", is_completed: false },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const wrap = ({ children }: any) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateShow(), { wrapper: wrap });

    await act(async () => {
      await result.current.mutateAsync({ name: "Cats", roles: [] });
    });

    expect(insert).toHaveBeenCalledWith({ name: "Cats", roles: [] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["shows"] });
  });
});
```

- [ ] **Step 2: Watch it fail**

Run: `npm test -- showService`
Expected: FAIL — `useCreateShow` not exported.

- [ ] **Step 3: Implement**

Append to `src/services/showService.ts`:
```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NewShow, ShowUpdate } from "@/lib/types";

export function useCreateShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewShow): Promise<Show> => {
      const { data, error } = await supabase.from("shows").insert(input).select().single();
      if (error) throw error;
      return data as Show;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: showKeys.all }),
  });
}
```

- [ ] **Step 4: Watch it pass**

Run: `npm test -- showService`

- [ ] **Step 5: Commit**

```bash
git add src/services/showService.ts __tests__/showService.test.tsx
git commit -m "feat(shows): add useCreateShow mutation"
```

---

## Task 10: `showService` — update, complete, delete mutations (TDD)

**Files:**
- Modify: `src/services/showService.ts`
- Modify: `__tests__/showService.test.tsx`

- [ ] **Step 1: Add failing tests**

Append:
```tsx
import { useUpdateShow, useCompleteShow, useDeleteShow } from "@/services/showService";

describe("useUpdateShow", () => {
  test("patches a show by id", async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: "s1" }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrap = ({ children }: any) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdateShow(), { wrapper: wrap });

    await act(async () => {
      await result.current.mutateAsync({ id: "s1", patch: { name: "Rent 2" } });
    });

    expect(update).toHaveBeenCalledWith({ name: "Rent 2" });
    expect(eq).toHaveBeenCalledWith("id", "s1");
  });
});

describe("useCompleteShow", () => {
  test("sets is_completed and completed_at", async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: "s1" }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrap = ({ children }: any) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCompleteShow(), { wrapper: wrap });

    await act(async () => {
      await result.current.mutateAsync("s1");
    });

    const patch = update.mock.calls[0][0];
    expect(patch.is_completed).toBe(true);
    expect(typeof patch.completed_at).toBe("string");
  });
});

describe("useDeleteShow", () => {
  test("deletes the row", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrap = ({ children }: any) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useDeleteShow(), { wrapper: wrap });

    await act(async () => {
      await result.current.mutateAsync("s1");
    });

    expect(del).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("id", "s1");
  });
});
```

- [ ] **Step 2: Watch them fail**

Run: `npm test -- showService`
Expected: FAIL — mutations not exported.

- [ ] **Step 3: Implement**

Append to `src/services/showService.ts`:
```ts
export function useUpdateShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: ShowUpdate }): Promise<Show> => {
      const { data, error } = await supabase
        .from("shows").update(input.patch).eq("id", input.id).select().single();
      if (error) throw error;
      return data as Show;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: showKeys.all });
      qc.invalidateQueries({ queryKey: showKeys.detail(vars.id) });
    },
  });
}

export function useCompleteShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<Show> => {
      const { data, error } = await supabase
        .from("shows")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", id).select().single();
      if (error) throw error;
      return data as Show;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: showKeys.all }),
  });
}

export function useDeleteShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("shows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: showKeys.all }),
  });
}
```

- [ ] **Step 4: Watch them pass**

Run: `npm test -- showService`

- [ ] **Step 5: Commit**

```bash
git add src/services/showService.ts __tests__/showService.test.tsx
git commit -m "feat(shows): add update, complete, delete mutations"
```

---

## Task 11: Home screen — active shows list

**Files:**
- Modify: `app/(app)/index.tsx`

- [ ] **Step 1: Implement**

```tsx
import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import { useShows, useCompleteShow, useDeleteShow } from "@/services/showService";
import { Show } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const { data, isLoading, error, refetch, isRefetching } = useShows({ completed: false });
  const complete = useCompleteShow();
  const del = useDeleteShow();

  if (isLoading && !data) return <View style={styles.center}><ActivityIndicator /></View>;
  if (error) return <View style={styles.center}><Text>Couldn't load shows.</Text></View>;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data ?? []}
        keyExtractor={(s) => s.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No shows yet</Text>
            <Text style={styles.emptyBody}>Tap “+” to add your first show.</Text>
          </View>
        }
        renderItem={({ item }: { item: Show }) => (
          <View style={styles.card}>
            <Link href={`/(app)/shows/${item.id}`} style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
            </Link>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => complete.mutate(item.id)}><Text style={styles.action}>✓</Text></Pressable>
              <Pressable onPress={() => del.mutate(item.id)}><Text style={[styles.action, { color: "#FF3B30" }]}>🗑</Text></Pressable>
            </View>
          </View>
        )}
      />
      <Pressable style={styles.fab} onPress={() => router.push("/(app)/shows/new")} accessibilityLabel="Add show">
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: 32, alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
  emptyBody: { color: "#666" },
  card: {
    flexDirection: "row", alignItems: "center", padding: 16,
    backgroundColor: "#fff", borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "#ddd",
  },
  name: { fontSize: 17, fontWeight: "500" },
  action: { fontSize: 20, padding: 4 },
  fab: {
    position: "absolute", right: 20, bottom: 32, width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#007AFF", alignItems: "center", justifyContent: "center",
  },
  fabPlus: { color: "#fff", fontSize: 32, lineHeight: 32 },
});
```

- [ ] **Step 2: Smoke-test**

Run app. Home shows empty state. Tapping `+` currently errors (next task).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/index.tsx"
git commit -m "feat(shows): active shows list on Home with empty state"
```

---

## Task 12: Add-show modal

**Files:**
- Create: `app/(app)/shows/new.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useCreateShow } from "@/services/showService";

export default function NewShow() {
  const router = useRouter();
  const create = useCreateShow();
  const [name, setName] = useState("");

  async function onSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await create.mutateAsync({ name: trimmed, roles: [] });
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't add show", e?.message ?? String(e));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Show name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Rent"
        autoFocus
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={onSave}
      />
      <View style={styles.row}>
        <Pressable style={styles.cancel} onPress={() => router.back()}>
          <Text>Cancel</Text>
        </Pressable>
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

- [ ] **Step 2: Configure as a modal in `app/(app)/_layout.tsx`**

Update to:
```tsx
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";

export default function AppLayout() {
  const { session, loading } = useAuth();
  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator /></View>;
  }
  if (!session) return <Redirect href="/(auth)/login" />;
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Shows" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="completed" options={{ title: "Completed" }} />
      <Stack.Screen name="shows/new" options={{ presentation: "modal", title: "New Show" }} />
    </Stack>
  );
}
```

- [ ] **Step 3: Smoke-test**

Run. Tap `+` → modal opens. Type "Rent" → Save → modal closes, list shows the new row.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/shows/new.tsx" "app/(app)/_layout.tsx"
git commit -m "feat(shows): add-show modal and route config"
```

---

## Task 13: Completed shows archive screen

**Files:**
- Create: `app/(app)/completed.tsx`

- [ ] **Step 1: Implement**

```tsx
import { FlatList, StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useShows, useUpdateShow, useDeleteShow } from "@/services/showService";

export default function Completed() {
  const { data, isLoading } = useShows({ completed: true });
  const update = useUpdateShow();
  const del = useDeleteShow();

  if (isLoading && !data) return <View style={styles.center}><ActivityIndicator /></View>;

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(s) => s.id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      ListEmptyComponent={<View style={styles.empty}><Text>No completed shows.</Text></View>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => update.mutate({ id: item.id, patch: { is_completed: false, completed_at: null } })}>
              <Text>↩︎ Unarchive</Text>
            </Pressable>
            <Pressable onPress={() => del.mutate(item.id)}>
              <Text style={{ color: "#FF3B30" }}>Delete</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: 32, alignItems: "center" },
  card: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, backgroundColor: "#fff", borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "#ddd",
  },
  name: { fontSize: 17, fontWeight: "500" },
});
```

- [ ] **Step 2: Add link from Settings**

Update `app/(app)/settings.tsx` to include, above the sign-out button:
```tsx
import { Link } from "expo-router";
// ...
<Link href="/(app)/completed" style={{ padding: 14, fontSize: 16, color: "#007AFF" }}>
  Completed shows →
</Link>
```

- [ ] **Step 3: Smoke-test**

Home → complete a show with the ✓ — it disappears. Settings → Completed shows → the show appears. Unarchive → it returns to Home.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/completed.tsx" "app/(app)/settings.tsx"
git commit -m "feat(shows): completed archive with unarchive and delete"
```

---

## Task 14: Cross-device acceptance test

- [ ] **Step 1: Run the test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Cross-device round-trip**

Sign in on Device A (your iPhone via Expo Go). Add a show "Rent." Sign in on Device B (another iPhone or iOS simulator) with the same Apple ID. Confirm "Rent" appears.

If you only have one device: sign out in-app, sign back in, confirm the show persists via cloud (not just local cache). Additionally, wipe Expo Go's data and resign in — the show must reappear.

- [ ] **Step 3: Offline read verification**

With a show in the list, enable airplane mode, kill the app, reopen. The active shows list must render from the persisted cache (no spinner beyond a flash). Disable airplane mode.

- [ ] **Step 4: Offline write fails gracefully**

Airplane mode, tap `+`, try to save. The mutation should error; the Alert fires with a reasonable message. Disable airplane mode.

- [ ] **Step 5: Tag the phase**

```bash
git tag phase-n2-complete
```

---

## Self-Review

- **Spec coverage:** schema + RLS ✓, TanStack Query + SQLite persister ✓, shows CRUD hooks ✓, Home list ✓, add-show flow ✓, complete/delete ✓, archive ✓, cross-device verification ✓, offline-read verification ✓.
- **Placeholder scan:** no TBDs; every code step contains runnable code.
- **Type consistency:** `Show`, `NewShow`, `ShowUpdate` reused consistently; `showKeys` names (`all`, `list`, `detail`) reused in mutation invalidations.
- **Note on tests:** mutation tests mock `supabase.from(...)` chains. If Supabase client shapes change in a way that breaks the chain shape, update the mocks when implementing.

---

## Next plan

After `phase-n2-complete`, write `YYYY-MM-DD-phase-n3-musical-numbers-and-scenes.md`.
