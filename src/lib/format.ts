import { weekdayName } from "./constants";
import { formatTime } from "./overlap";
import type { ClubSession } from "./types";

/** [3,4,5] -> "3-5" | [1,2,4] -> "1-2, 4" | [3] -> "3" */
export function formatGrades(grades: number[]): string {
  const sorted = [...new Set(grades)].sort((a, b) => a - b);
  if (sorted.length === 0) return "—";

  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = cur;
    prev = cur;
  }

  return parts.join(", ");
}

/** [3,4,5] -> "3-5-р анги" */
export function formatGradesLabel(grades: number[]): string {
  return `${formatGrades(grades)}-р анги`;
}

/** Нэг хичээлийн цагийг уншигдахаар: "Даваа 14:50–15:50" */
export function formatSession(session: ClubSession): string {
  if (session.weekday == null) {
    return session.note?.trim() || "Цаг тодорхойгүй";
  }
  const day = weekdayName(session.weekday);
  const start = formatTime(session.start_time);
  const end = formatTime(session.end_time);
  if (!start || !end) return day;
  return `${day} ${start}–${end}`;
}

/** Гараг -> цаг гэсэн дарааллаар эрэмбэлнэ */
export function sortSessions(sessions: ClubSession[]): ClubSession[] {
  return [...sessions].sort((a, b) => {
    if (a.weekday == null) return 1;
    if (b.weekday == null) return -1;
    if (a.weekday !== b.weekday) return a.weekday - b.weekday;
    return (a.start_time ?? "").localeCompare(b.start_time ?? "");
  });
}

/** "2026-09-15T08:30:00Z" -> "2026.09.15 16:30" (хэрэглэгчийн цагийн бүсээр) */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "99112233" -> "9911 2233" */
export function formatPhone(value: string): string {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length === 8 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : value;
}
