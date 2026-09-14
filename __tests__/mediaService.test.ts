import * as FileSystem from "expo-file-system/legacy";
import { deleteAllCachedMedia, MEDIA_DIR } from "@/services/mediaService";
import { mediaCache } from "@/db/mediaCache";

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///documents/",
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("expo-crypto", () => ({ randomUUID: jest.fn() }));
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/db/mediaCache", () => ({ mediaCache: { clear: jest.fn() } }));

describe("deleteAllCachedMedia", () => {
  beforeEach(() => jest.clearAllMocks());

  test("deletes the media directory, then empties the media_cache table", async () => {
    const order: string[] = [];
    (FileSystem.deleteAsync as jest.Mock).mockImplementation(async () => {
      order.push("deleteDir");
    });
    (mediaCache.clear as jest.Mock).mockImplementation(() => order.push("clearTable"));

    await deleteAllCachedMedia();

    expect(MEDIA_DIR).toBe("file:///documents/media");
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(MEDIA_DIR, { idempotent: true });
    expect(order).toEqual(["deleteDir", "clearTable"]);
  });

  test("leaves the table alone when the files could not be deleted", async () => {
    (FileSystem.deleteAsync as jest.Mock).mockRejectedValue(new Error("disk error"));

    await expect(deleteAllCachedMedia()).rejects.toThrow(/disk error/);
    expect(mediaCache.clear).not.toHaveBeenCalled();
  });
});
