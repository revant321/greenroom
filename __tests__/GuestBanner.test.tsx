import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { AuthProvider } from "@/hooks/useAuth";
import { GuestBanner } from "@/components/GuestBanner";
import { supabase } from "@/lib/supabase";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/theme/useTheme", () => ({
  useTheme: () => ({
    colors: { accentSoft: "#eee", border: "#ccc", text: "#000", textMuted: "#666", accent: "#70f" },
  }),
}));
jest.mock("@/components/Icon", () => ({ Icon: () => null }));
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

function renderBanner(session: any) {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session } });
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <GuestBanner />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("GuestBanner", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders for a guest session and links to the upgrade screen", async () => {
    const { findByText } = renderBanner({ user: { id: "g1", is_anonymous: true } });
    expect(await findByText(/without an account/)).toBeTruthy();

    fireEvent.press(await findByText("Create an account"));
    expect(mockPush).toHaveBeenCalledWith("/upgrade");
  });

  test("hides for a signed-in (non-guest) session", async () => {
    const { queryByText } = renderBanner({ user: { id: "u1", is_anonymous: false } });
    await waitFor(() => expect(supabase.auth.getSession).toHaveBeenCalled());
    expect(queryByText(/without an account/)).toBeNull();
  });

  test("dismiss hides it for the rest of the session", async () => {
    const { findByText, getByLabelText, queryByText } = renderBanner({
      user: { id: "g1", is_anonymous: true },
    });
    await findByText(/without an account/);
    fireEvent.press(getByLabelText("Dismiss"));
    await waitFor(() => expect(queryByText(/without an account/)).toBeNull());
  });
});
