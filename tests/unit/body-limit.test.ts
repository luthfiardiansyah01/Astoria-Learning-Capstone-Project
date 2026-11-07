import { describe, expect, it } from "vitest";
import {
  BODY_LIMIT_DEFAULT,
  BODY_LIMIT_WEBHOOK,
  bodyLimitForPath,
  exceedsBodyLimit,
} from "@/lib/body-limit";

describe("body limit", () => {
  it("memakai batas lebih kecil untuk webhook", () => {
    expect(bodyLimitForPath("/api/billing/webhook/midtrans")).toBe(BODY_LIMIT_WEBHOOK);
    expect(bodyLimitForPath("/api/billing/webhook/xendit")).toBe(BODY_LIMIT_WEBHOOK);
    expect(bodyLimitForPath("/api/chat")).toBe(BODY_LIMIT_DEFAULT);
  });

  it("mendeteksi body melebihi batas", () => {
    expect(exceedsBodyLimit("/api/chat", String(BODY_LIMIT_DEFAULT + 1))).toBe(true);
    expect(exceedsBodyLimit("/api/chat", String(BODY_LIMIT_DEFAULT))).toBe(false);
    expect(exceedsBodyLimit("/api/billing/webhook/midtrans", String(BODY_LIMIT_WEBHOOK + 1))).toBe(true);
  });

  it("mengabaikan header kosong/tidak valid", () => {
    expect(exceedsBodyLimit("/api/chat", null)).toBe(false);
    expect(exceedsBodyLimit("/api/chat", "bukan-angka")).toBe(false);
    expect(exceedsBodyLimit("/api/chat", "-1")).toBe(false);
  });
});
