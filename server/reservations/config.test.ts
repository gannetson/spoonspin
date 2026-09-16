/** @vitest-environment node */
import { afterEach, describe, expect, it } from "vitest";
import {
  isGuestplanEnabled,
  isProviderEnabled,
  isReservationsEnabled,
  isTheForkEnabled,
  isZenchefEnabled,
  listReservationProviders,
} from "./config";

describe("reservation feature flags", () => {
  const keys = [
    "RESERVATIONS_ENABLED",
    "ZENCHEF_ENABLED",
    "GUESTPLAN_ENABLED",
    "THEFORK_ENABLED",
  ] as const;

  afterEach(() => {
    for (const key of keys) delete process.env[key];
  });

  it("defaults all reservation providers off", () => {
    for (const key of keys) delete process.env[key];
    expect(isReservationsEnabled()).toBe(false);
    expect(isZenchefEnabled()).toBe(false);
    expect(isGuestplanEnabled()).toBe(false);
    expect(isTheForkEnabled()).toBe(false);
  });

  it("requires master switch before a provider is enabled", () => {
    process.env.ZENCHEF_ENABLED = "true";
    expect(isZenchefEnabled()).toBe(false);
    process.env.RESERVATIONS_ENABLED = "true";
    expect(isZenchefEnabled()).toBe(true);
    expect(isProviderEnabled("guestplan")).toBe(false);
  });

  it("lists catalog providers with intended capabilities", () => {
    process.env.RESERVATIONS_ENABLED = "1";
    process.env.THEFORK_ENABLED = "true";
    const providers = listReservationProviders();
    expect(providers.map((p) => p.key)).toEqual(["zenchef", "guestplan", "thefork"]);
    expect(providers.find((p) => p.key === "thefork")?.enabled).toBe(true);
    expect(providers.find((p) => p.key === "zenchef")?.enabled).toBe(false);
    expect(providers.find((p) => p.key === "zenchef")?.capabilities.availability).toBe(
      true,
    );
  });
});
