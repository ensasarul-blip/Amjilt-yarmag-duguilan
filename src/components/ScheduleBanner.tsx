"use client";

import { useEffect, useState } from "react";
import { LEVELS } from "@/lib/constants";
import { formatCountdown, formatScheduleDay, hasSchedule, levelState } from "@/lib/schedule";
import type { Level, LevelSchedule } from "@/lib/types";

/**
 * Шатласан бүртгэлийн хуваарь: түвшин бүр өөрийн өдөр нээгдэнэ.
 *
 * Цагийг хөтөч дээр тооцно — хуудас кешлэгдсэн ч тоолуур зөв явна.
 */
export default function ScheduleBanner({
  schedule,
  highlight,
}: {
  schedule: LevelSchedule[];
  highlight?: Level | null;
}) {
  // Сервер ба хөтөч зөрөхөөс сэргийлж эхлээд null, дараа нь хөтөч дээр тавина
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!hasSchedule(schedule)) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border-2 border-nil-300 bg-white">
      <p className="bg-nil-100 px-4 py-2.5 text-sm font-bold text-nil-900">
        Бүртгэлийн хуваарь
      </p>

      <ul className="divide-y-2 divide-nil-100">
        {LEVELS.map((lv) => {
          const st = now ? levelState(schedule, lv.value, now) : null;
          const row = schedule.find((r) => r.level === lv.value);
          const opensAt = row?.opens_at ? new Date(row.opens_at) : null;
          const isOpen = st?.state === "open" || st?.state === "always";
          const isPast = st?.state === "after";
          const isTarget = highlight === lv.value;

          return (
            <li
              key={lv.value}
              className={`flex items-center gap-3 px-4 py-3 ${
                isOpen ? "bg-nil-800 text-white" : isTarget ? "bg-nil-100" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${isOpen ? "text-white" : "text-nil-900"}`}>
                  {lv.name}
                  <span className={`ml-1.5 font-normal ${isOpen ? "text-nil-300" : "text-nil-600"}`}>
                    ({lv.grades[0]}-{lv.grades[lv.grades.length - 1]})
                  </span>
                </p>
                <p className={`mt-0.5 text-xs ${isOpen ? "text-nil-300" : "text-nil-600"}`}>
                  {opensAt ? formatScheduleDay(opensAt) : "Хугацаа заагаагүй"}
                </p>
              </div>

              {/* Төлөв — хөтөч ачаалагдсаны дараа гарна */}
              {st ? (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    isOpen
                      ? "bg-white text-nil-900"
                      : isPast
                        ? "bg-nil-100 text-nil-600"
                        : "border border-nil-300 text-nil-600"
                  }`}
                >
                  {isOpen ? "Нээлттэй" : isPast ? "Дууссан" : "Хүлээгдэж байна"}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <Countdown schedule={schedule} now={now} />
    </div>
  );
}

/** Хамгийн ойрын нээгдэх хугацаа хүртэл үлдсэн хугацаа */
function Countdown({ schedule, now }: { schedule: LevelSchedule[]; now: Date | null }) {
  if (!now) return null;

  const anyOpen = LEVELS.some((lv) => {
    const st = levelState(schedule, lv.value, now);
    return st.state === "open" || st.state === "always";
  });
  if (anyOpen) return null;

  const next = LEVELS.map((lv) => {
    const st = levelState(schedule, lv.value, now);
    return st.state === "before" ? { name: lv.name, at: st.opensAt } : null;
  })
    .filter((x): x is { name: string; at: Date } => x !== null)
    .sort((a, b) => a.at.getTime() - b.at.getTime())[0];

  if (!next) {
    return (
      <p className="border-t-2 border-nil-100 px-4 py-3 text-sm text-nil-600">
        Бүртгэлийн хугацаа дууссан. Сургуулийн админд хандана уу.
      </p>
    );
  }

  return (
    <p className="border-t-2 border-nil-100 px-4 py-3 text-sm text-nil-800">
      <strong>{next.name}</strong>-ийн бүртгэл нээгдэх хүртэл{" "}
      <strong className="text-nil-900">{formatCountdown(next.at.getTime() - now.getTime())}</strong>
    </p>
  );
}
