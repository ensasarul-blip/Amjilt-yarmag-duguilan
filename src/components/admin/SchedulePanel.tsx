"use client";

import { useActionState } from "react";
import { updateScheduleAction, type ActionState } from "@/app/admin/actions";
import { LEVELS } from "@/lib/constants";
import { formatScheduleDay, hasSchedule } from "@/lib/schedule";
import type { LevelSchedule } from "@/lib/types";

/** timestamptz -> "YYYY-MM-DD" (Улаанбаатарын цагаар) */
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export default function SchedulePanel({ schedule }: { schedule: LevelSchedule[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateScheduleAction,
    null,
  );

  const on = hasSchedule(schedule);

  return (
    <details className="rounded-xl border-2 border-nil-300 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-bold text-nil-900">
        <span>Шатласан бүртгэл</span>
        <span className="shrink-0 rounded bg-nil-100 px-1.5 py-0.5 text-xs font-normal text-nil-800">
          {on ? "Хуваарьтай" : "Хязгааргүй"}
        </span>
      </summary>

      <form action={formAction} className="border-t-2 border-nil-100 p-3">
        <p className="mb-3 text-xs leading-relaxed text-nil-600">
          Түвшин бүр ЗӨВХӨН заасан өдрөө бүртгүүлнэ (тухайн өдрийн 00:00-ээс
          маргаашийн 00:00 хүртэл). Хоосон орхивол тэр түвшинд хязгаар байхгүй.
        </p>

        <div className="space-y-3">
          {LEVELS.map((lv) => {
            const row = schedule.find((r) => r.level === lv.value);
            const value = toDateInput(row?.opens_at ?? null);
            return (
              <div key={lv.value}>
                <label
                  htmlFor={`date_${lv.value}`}
                  className="block text-sm font-bold text-nil-800"
                >
                  {lv.name}{" "}
                  <span className="font-normal text-nil-600">
                    ({lv.grades[0]}-{lv.grades[lv.grades.length - 1]}-р анги)
                  </span>
                </label>
                <input
                  id={`date_${lv.value}`}
                  name={`date_${lv.value}`}
                  type="date"
                  defaultValue={value}
                  className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-nil-300 px-3 text-nil-900"
                />
                {row?.opens_at ? (
                  <p className="mt-1 text-xs text-nil-600">
                    Одоо: {formatScheduleDay(new Date(row.opens_at))}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        {state && (
          <p
            className={`mt-3 text-sm font-bold ${
              state.ok ? "text-nil-800" : "text-anhaar-600"
            }`}
          >
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-3 min-h-12 w-full rounded-xl bg-nil-800 px-4 text-base font-bold text-white disabled:bg-nil-300"
        >
          {pending ? "Хадгалж байна…" : "Хуваарь хадгалах"}
        </button>
      </form>
    </details>
  );
}
