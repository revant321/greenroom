import {
  collectShowStoragePaths,
  collectSongStoragePaths,
} from "@/services/cascadeDelete";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/db/mediaCache", () => ({
  mediaCache: { get: jest.fn(() => null), remove: jest.fn() },
}));
jest.mock("expo-file-system/legacy", () => ({
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

function mockTable(rows: any[]) {
  const eq = jest.fn().mockResolvedValue({ data: rows, error: null });
  const select = jest.fn().mockReturnValue({ eq });
  return { select };
}

describe("collectShowStoragePaths", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns all storage paths across descendants", async () => {
    const byTable: Record<string, any[]> = {
      musical_numbers: [{ id: "m1" }, { id: "m2" }],
      harmonies: [
        { storage_path: "u/harmonies/h1.m4a" },
        { storage_path: "u/harmonies/h2.m4a" },
      ],
      dance_videos: [
        { storage_path: "u/dance-videos/d1.mp4" },
        { storage_path: null },
      ],
      sheet_music: [{ storage_path: "u/sheet-music/s1.pdf" }],
      scenes: [{ id: "sc1" }],
      scene_recordings: [{ storage_path: "u/scene-recordings/r1.m4a" }],
    };
    (supabase.from as jest.Mock).mockImplementation((t: string) =>
      mockTable(byTable[t] ?? []),
    );

    const paths = await collectShowStoragePaths("show-1");
    expect(new Set(paths)).toEqual(
      new Set([
        "u/harmonies/h1.m4a",
        "u/harmonies/h2.m4a",
        "u/dance-videos/d1.mp4",
        "u/sheet-music/s1.pdf",
        "u/scene-recordings/r1.m4a",
      ]),
    );
  });

  test("returns empty array when show has no descendants", async () => {
    (supabase.from as jest.Mock).mockImplementation(() => mockTable([]));
    const paths = await collectShowStoragePaths("empty-show");
    expect(paths).toEqual([]);
  });
});

describe("collectSongStoragePaths", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns all storage paths across song descendants", async () => {
    const byTable: Record<string, any[]> = {
      song_parts: [{ storage_path: "u/song-parts/p1.m4a" }],
      song_tracks: [
        { storage_path: "u/song-tracks/t1.m4a" },
        { storage_path: null, external_url: "https://youtu.be/x" },
      ],
      song_sheet_music: [{ storage_path: "u/song-sheet-music/s1.pdf" }],
    };
    (supabase.from as jest.Mock).mockImplementation((t: string) =>
      mockTable(byTable[t] ?? []),
    );

    const paths = await collectSongStoragePaths("song-1");
    expect(new Set(paths)).toEqual(
      new Set([
        "u/song-parts/p1.m4a",
        "u/song-tracks/t1.m4a",
        "u/song-sheet-music/s1.pdf",
      ]),
    );
  });
});
