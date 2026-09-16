import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  formatScheduleDay,
  hasSchedule,
  levelState,
} from "../lib/schedule";
import type { LevelSchedule } from "../lib/types";

/** 2026-09-21 00:00 Улаанбаатарын цагаар = 2026-09-20T16:00:00Z */
const SCHEDULE: LevelSchedule[] = [
  { level: "baga", opens_at: "2026-09-20T16:00:00Z", closes_at: "2026-09-21T16:00:00Z", sort_order: 1 },
  { level: "dund", opens_at: "2026-09-21T16:00:00Z", closes_at: "2026-09-22T16:00:00Z", sort_order: 2 },
  { level: "ahlah", opens_at: "2026-09-22T16:00:00Z", closes_at: "2026-09-23T16:00:00Z", sort_order: 3 },
];

const at = (iso: string) => new Date(iso);

describe("Шатласан бүртгэлийн төлөв", () => {
  it("9-р сарын 16-нд бүх түвшин хараахан нээгдээгүй", () => {
    const now = at("2026-09-16T05:00:00Z");
    expect(levelState(SCHEDULE, "baga", now).state).toBe("before");
    expect(levelState(SCHEDULE, "dund", now).state).toBe("before");
    expect(levelState(SCHEDULE, "ahlah", now).state).toBe("before");
  });

  it("9-р сарын 21-ний өдөр ЗӨВХӨН бага анги нээлттэй", () => {
    // Улаанбаатарын цагаар 21-ний өдрийн 10:00 = 02:00Z
    const now = at("2026-09-21T02:00:00Z");
    expect(levelState(SCHEDULE, "baga", now).state).toBe("open");
    expect(levelState(SCHEDULE, "dund", now).state).toBe("before");
    expect(levelState(SCHEDULE, "ahlah", now).state).toBe("before");
  });

  it("9-р сарын 22-нд бага ДУУССАН, дунд нээлттэй", () => {
    const now = at("2026-09-22T02:00:00Z");
    expect(levelState(SCHEDULE, "baga", now).state).toBe("after");
    expect(levelState(SCHEDULE, "dund", now).state).toBe("open");
    expect(levelState(SCHEDULE, "ahlah", now).state).toBe("before");
  });

  it("9-р сарын 23-нд зөвхөн ахлах нээлттэй", () => {
    const now = at("2026-09-23T02:00:00Z");
    expect(levelState(SCHEDULE, "baga", now).state).toBe("after");
    expect(levelState(SCHEDULE, "dund", now).state).toBe("after");
    expect(levelState(SCHEDULE, "ahlah", now).state).toBe("open");
  });

  it("9-р сарын 24-нд бүгд дууссан", () => {
    const now = at("2026-09-24T02:00:00Z");
    for (const lv of ["baga", "dund", "ahlah"] as const) {
      expect(levelState(SCHEDULE, lv, now).state).toBe("after");
    }
  });

  it("яг нээгдэх агшинд нээлттэй болно (хилийн утга)", () => {
    expect(levelState(SCHEDULE, "baga", at("2026-09-20T16:00:00Z")).state).toBe("open");
    expect(levelState(SCHEDULE, "baga", at("2026-09-20T15:59:59Z")).state).toBe("before");
  });

  it("яг хаагдах агшинд дуусна (хилийн утга)", () => {
    expect(levelState(SCHEDULE, "baga", at("2026-09-21T15:59:59Z")).state).toBe("open");
    expect(levelState(SCHEDULE, "baga", at("2026-09-21T16:00:00Z")).state).toBe("after");
  });

  it("хуваарь тохируулаагүй бол үргэлж нээлттэй", () => {
    const empty: LevelSchedule[] = [
      { level: "baga", opens_at: null, closes_at: null, sort_order: 1 },
    ];
    expect(levelState(empty, "baga", at("2026-01-01T00:00:00Z")).state).toBe("always");
    expect(levelState([], "dund", at("2026-01-01T00:00:00Z")).state).toBe("always");
    expect(hasSchedule(empty)).toBe(false);
    expect(hasSchedule(SCHEDULE)).toBe(true);
  });
});

describe("Огноо, тоолуурын бичиглэл", () => {
  it("огноог Улаанбаатарын цагаар гаргана", () => {
    expect(formatScheduleDay(at("2026-09-20T16:00:00Z"))).toBe("9-р сарын 21, Даваа гараг");
    expect(formatScheduleDay(at("2026-09-21T16:00:00Z"))).toBe("9-р сарын 22, Мягмар гараг");
    expect(formatScheduleDay(at("2026-09-22T16:00:00Z"))).toBe("9-р сарын 23, Лхагва гараг");
  });

  it("үлдсэн хугацааг монголоор бичнэ", () => {
    expect(formatCountdown(4 * 86400_000 + 8 * 3600_000)).toBe("4 өдөр 8 цаг");
    expect(formatCountdown(2 * 3600_000 + 15 * 60_000)).toBe("2 цаг 15 минут");
    expect(formatCountdown(38 * 60_000)).toBe("38 минут");
    expect(formatCountdown(0)).toBe("0 минут");
    expect(formatCountdown(-5000)).toBe("0 минут");
  });
});
