import { describe, expect, it } from "vitest";
import { SESSION_DEFAULT_HOURS, SESSION_MAX_HOURS, sessionMaxAgeSeconds } from "@/lib/session-policy";

describe("sessionMaxAgeSeconds", () => {
  it("memakai 12 jam bila nilai kosong atau tidak valid", () => {
    expect(sessionMaxAgeSeconds(undefined)).toBe(SESSION_DEFAULT_HOURS * 3600);
    expect(sessionMaxAgeSeconds("")).toBe(SESSION_DEFAULT_HOURS * 3600);
    expect(sessionMaxAgeSeconds("bukan-angka")).toBe(SESSION_DEFAULT_HOURS * 3600);
    expect(sessionMaxAgeSeconds("0")).toBe(SESSION_DEFAULT_HOURS * 3600);
    expect(sessionMaxAgeSeconds("-5")).toBe(SESSION_DEFAULT_HOURS * 3600);
  });

  it("mengikuti nilai env yang valid", () => {
    expect(sessionMaxAgeSeconds("8")).toBe(8 * 3600);
    expect(sessionMaxAgeSeconds("1.5")).toBe(1.5 * 3600);
  });

  it("membatasi maksimal 7 hari dan minimal 1 jam", () => {
    expect(sessionMaxAgeSeconds("999")).toBe(SESSION_MAX_HOURS * 3600);
    expect(sessionMaxAgeSeconds("0.1")).toBe(3600);
  });
});
