import { secureStoreAdapter } from "@/lib/secureStoreAdapter";
import * as SecureStore from "expo-secure-store";

jest.mock("expo-secure-store");

describe("secureStoreAdapter", () => {
  beforeEach(() => jest.resetAllMocks());

  test("getItem delegates to SecureStore.getItemAsync", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("stored-value");
    await expect(secureStoreAdapter.getItem("k")).resolves.toBe("stored-value");
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("k");
  });

  test("setItem delegates to SecureStore.setItemAsync", async () => {
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    await secureStoreAdapter.setItem("k", "v");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("k", "v");
  });

  test("removeItem delegates to SecureStore.deleteItemAsync", async () => {
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    await secureStoreAdapter.removeItem("k");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("k");
  });

  test("getItem returns null when SecureStore returns null", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    await expect(secureStoreAdapter.getItem("missing")).resolves.toBeNull();
  });
});
