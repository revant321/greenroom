import { mediaCache } from "@/db/mediaCache";

const mockRows = new Map<
  string,
  { local_uri: string; downloaded_at: number; size_bytes: number | null }
>();

jest.mock("@/db/sqlite", () => ({
  getDb: () => ({
    getFirstSync: (_sql: string, key: string) => mockRows.get(key) ?? null,
    runSync: (sql: string, ...params: any[]) => {
      if (sql.startsWith("INSERT")) {
        mockRows.set(params[0], {
          local_uri: params[1],
          downloaded_at: params[2],
          size_bytes: params[3] ?? null,
        });
      } else if (sql.startsWith("DELETE")) {
        mockRows.delete(params[0]);
      }
    },
  }),
}));

beforeEach(() => mockRows.clear());

describe("mediaCache", () => {
  test("put and get round-trip", () => {
    mediaCache.put("a/b.m4a", "file:///tmp/b.m4a", 1234);
    expect(mediaCache.get("a/b.m4a")).toMatchObject({
      local_uri: "file:///tmp/b.m4a",
      size_bytes: 1234,
    });
  });

  test("get returns null for missing path", () => {
    expect(mediaCache.get("missing")).toBeNull();
  });

  test("remove deletes the entry", () => {
    mediaCache.put("a/b.m4a", "file:///tmp/b.m4a", 10);
    mediaCache.remove("a/b.m4a");
    expect(mediaCache.get("a/b.m4a")).toBeNull();
  });
});
