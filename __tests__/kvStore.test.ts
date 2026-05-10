import { kvStore } from "@/db/kvStore";

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
