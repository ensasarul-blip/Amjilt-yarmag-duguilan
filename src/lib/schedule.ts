import type { Level, LevelSchedule } from "./types";

/** Монголын цагаар харуулна — төхөөрөмжийн цагийн бүснээс хамаарахгүй */
const TZ = "Asia/Ulaanbaatar";

const WEEKDAY_NAMES = [
  "Ням",
  "Даваа",
  "Мягмар",
  "Лхагва",
  "Пүрэв",
  "Баасан",
  "Бямба",
];

export type LevelState =
  | { state: "always" } // хуваарь тохируулаагүй — үргэлж нээлттэй
  | { state: "before"; opensAt: Date; closesAt: Date | null }
  | { state: "open"; opensAt: Date | null; closesAt: Date | null }
  | { state: "after"; closesAt: Date };

/** Тухайн түвшин ЯГ ОДОО нээлттэй эсэх */
export function levelState(
  schedule: LevelSchedule[],
  level: Level,
  now: Date = new Date(),
): LevelState {
  const row = schedule.find((r) => r.level === level);
  if (!row || (!row.opens_at && !row.closes_at)) return { state: "always" };

  const opensAt = row.opens_at ? new Date(row.opens_at) : null;
  const closesAt = row.closes_at ? new Date(row.closes_at) : null;

  if (opensAt && now < opensAt) return { state: "before", opensAt, closesAt };
  if (closesAt && now >= closesAt) return { state: "after", closesAt };
  return { state: "open", opensAt, closesAt };
}

/** Хуваарь ер нь тохируулагдсан эсэх */
export function hasSchedule(schedule: LevelSchedule[]): boolean {
  return schedule.some((r) => r.opens_at || r.closes_at);
}

/** "9-р сарын 21, Даваа гараг" */
export function formatScheduleDay(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const month = Number(get("month"));
  const day = Number(get("day"));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const name = wd >= 0 ? WEEKDAY_NAMES[wd] : "";
  return `${month}-р сарын ${day}${name ? `, ${name} гараг` : ""}`;
}

/** "4 өдөр 8 цаг" / "2 цаг 15 минут" / "38 минут" */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0 минут";
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;

  if (days > 0) return `${days} өдөр ${hours} цаг`;
  if (hours > 0) return `${hours} цаг ${mins} минут`;
  return `${mins} минут`;
}
