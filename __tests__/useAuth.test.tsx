import React from "react";
import { Text } from "react-native";
import { render, waitFor, act } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => {
  const listeners: Array<(event: string, session: any) => void> = [];
  return {
    supabase: {
      auth: {
        getSession: jest.fn(),
        onAuthStateChange: jest.fn((cb) => {
          listeners.push(cb);
          return { data: { subscription: { unsubscribe: jest.fn() } } };
        }),
        __emit: (event: string, session: any) =>
          listeners.forEach((cb) => cb(event, session)),
      },
    },
  };
});

function Probe() {
  const { session, loading } = useAuth();
  if (loading) return <Text>loading</Text>;
  return <Text>{session ? `user:${session.user.id}` : "no-session"}</Text>;
}

describe("useAuth", () => {
  beforeEach(() => jest.clearAllMocks());

  test("initially loading, then resolves to no session", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });
    const { getByText } = render(<AuthProvider><Probe /></AuthProvider>);
    expect(getByText("loading")).toBeTruthy();
    await waitFor(() => expect(getByText("no-session")).toBeTruthy());
  });

  test("hydrates with existing session", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    const { findByText } = render(<AuthProvider><Probe /></AuthProvider>);
    expect(await findByText("user:u1")).toBeTruthy();
  });

  test("updates on auth state change", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    const { findByText } = render(<AuthProvider><Probe /></AuthProvider>);
    expect(await findByText("no-session")).toBeTruthy();

    await act(async () => {
      (supabase.auth as any).__emit("SIGNED_IN", { user: { id: "u2" } });
    });
    expect(await findByText("user:u2")).toBeTruthy();
  });
});
