import React from "react";
// Mock next/navigation hooks used by SettingsPage
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (k: string) => null }),
}));
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock useAuth to provide a test user
jest.mock("@/context/AuthContext.js", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "u@example.com", first_name: "Test" },
  }),
}));

describe("Settings page save handlers", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("saveNotifications happy path calls user_settings.upsert", async () => {
    // Setup mock supabase where user_settings.upsert succeeds
    const behavior: any = {
      user_settings: [{ data: {}, error: null }],
    };

    const mockSupabase: any = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: null, error: null }) }),
        }),
        upsert: async (payload: any) => {
          const bucket = behavior[table] || [{ data: null, error: null }];
          const res = bucket.shift();
          return res;
        },
      }),
    };

    // call handler directly so we don't render client component (avoids hooks)
    const { saveNotificationsHandler } = await import("../handlers");
    await expect(
      saveNotificationsHandler({
        effectiveUser: { id: "user-1", email: "u@example.com" },
        notifications: { email: true, sms: false, weekly: false },
        supabase: mockSupabase,
        debug: false,
        debugApiEnabled: false,
      })
    ).resolves.toEqual({ ok: true });
  });

  test("saveNotifications missing profile -> creates profile then retries user_settings upsert", async () => {
    // Ensure debug query param is not present so debugApiEnabled is false in client
    const origLocation = global.location;
    // @ts-ignore
    delete (global as any).location;
    // @ts-ignore
    (global as any).location = { search: "" };

    // Setup behavior arrays: first user_settings.upsert fails, then user_profiles.upsert succeeds, then user_settings.upsert retry succeeds
    const behavior: any = {
      user_settings: [
        { data: null, error: { message: "FK missing" } },
        { data: {}, error: null },
      ],
      user_profiles: [{ data: {}, error: null }],
    };

    const calls: Array<{ table: string; payload: any }> = [];

    const mockSupabase: any = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: null, error: null }) }),
        }),
        upsert: async (payload: any) => {
          calls.push({ table, payload });
          const bucket = behavior[table] || [{ data: null, error: null }];
          const res = bucket.shift();
          return res;
        },
      }),
    };

    jest.doMock("@/lib/supabase", () => ({ supabase: mockSupabase }));

    // call handler directly so we don't render client component (avoids hooks)
    const { saveNotificationsHandler } = await import("../handlers");
    await expect(
      saveNotificationsHandler({
        effectiveUser: { id: "user-1", email: "u@example.com" },
        notifications: { email: true, sms: true, weekly: false },
        supabase: mockSupabase,
        debug: false,
        debugApiEnabled: false,
      })
    ).resolves.toEqual({ ok: true });

    // Restore location
    // @ts-ignore
    delete (global as any).location;
    // @ts-ignore
    (global as any).location = origLocation;
  });
});
