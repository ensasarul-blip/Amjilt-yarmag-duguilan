import { weekdayName } from "./constants";

export type SessionLike = {
  weekday: number | null;
  start_time: string | null;
  end_time: string | null;
};

export type ClubLike = {
  id: string;
  name: string;
  sessions: SessionLike[];
};

export type Conflict = {
  weekday: number;
  /** Давхцал эхлэх цаг, "14:50" хэлбэрээр */
  time: string;
  clubAId: string;
  clubBId: string;
  clubAName: string;
  clubBName: string;
  /** "Даваа 14:50 цагт Таеквондо болон Шатар давхцаж байна" */
  message: string;
};

/** "14:50:00" эсвэл "14:50" -> минутаар (890). Буруу утга бол null. */
export function timeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 890 -> "14:50" */
export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "14:50:00" -> "14:50" (харагдацад) */
export function formatTime(value: string | null | undefined): string {
  const mins = timeToMinutes(value);
  return mins == null ? "" : minutesToTime(mins);
}

/**
 * Хоёр хичээлийн цаг давхцаж байна уу?
 * Зэрэгцэн шүргэлцэх (14:00–15:00 ба 15:00–16:00) нь давхцал БИШ.
 */
export function sessionsOverlap(a: SessionLike, b: SessionLike): boolean {
  if (a.weekday == null || b.weekday == null) return false;
  if (a.weekday !== b.weekday) return false;

  const aStart = timeToMinutes(a.start_time);
  const aEnd = timeToMinutes(a.end_time);
  const bStart = timeToMinutes(b.start_time);
  const bEnd = timeToMinutes(b.end_time);

  // Цаг нь тодорхойгүй бол давхцлыг мэдэх боломжгүй
  if (aStart == null || aEnd == null || bStart == null || bEnd == null) return false;

  return aStart < bEnd && bStart < aEnd;
}

/**
 * Сонгосон дугуйлангуудын хооронд цагийн давхцлыг олно.
 * Нэг дугуйлан олон цагтай бол (ж: Шатар 3-р анги) БҮХ цагийг тооцно.
 */
export function findConflicts(clubs: ClubLike[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < clubs.length; i++) {
    for (let j = i + 1; j < clubs.length; j++) {
      const a = clubs[i];
      const b = clubs[j];

      for (const sa of a.sessions ?? []) {
        for (const sb of b.sessions ?? []) {
          if (!sessionsOverlap(sa, sb)) continue;

          const start = Math.max(
            timeToMinutes(sa.start_time)!,
            timeToMinutes(sb.start_time)!,
          );
          const time = minutesToTime(start);
          const key = `${a.id}|${b.id}|${sa.weekday}|${time}`;
          if (seen.has(key)) continue;
          seen.add(key);

          conflicts.push({
            weekday: sa.weekday!,
            time,
            clubAId: a.id,
            clubBId: b.id,
            clubAName: a.name,
            clubBName: b.name,
            message: `${weekdayName(sa.weekday)} ${time} цагт ${a.name} болон ${b.name} давхцаж байна`,
          });
        }
      }
    }
  }

  return conflicts;
}
