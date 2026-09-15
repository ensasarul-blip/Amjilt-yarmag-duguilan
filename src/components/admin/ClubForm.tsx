"use client";

import { useActionState, useState } from "react";
import { GRADES, LEVELS, WEEKDAYS } from "@/lib/constants";
import { formatTime } from "@/lib/overlap";
import type { ActionState } from "@/app/admin/actions";
import type { ClubView } from "@/lib/types";

type SessionRow = {
  key: string;
  weekday: number | null;
  start_time: string;
  end_time: string;
};

function initialSessions(club?: ClubView): SessionRow[] {
  if (!club || club.sessions.length === 0) {
    return [{ key: "s0", weekday: 1, start_time: "15:40", end_time: "16:40" }];
  }
  return club.sessions.map((s, i) => ({
    key: `s${i}`,
    weekday: s.weekday,
    start_time: formatTime(s.start_time),
    end_time: formatTime(s.end_time),
  }));
}

export default function ClubForm({
  club,
  action,
  submitLabel,
}: {
  club?: ClubView;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );
  const [sessions, setSessions] = useState<SessionRow[]>(() => initialSessions(club));
  const [unlimited, setUnlimited] = useState(club ? club.capacity == null : true);

  const updateSession = (key: string, patch: Partial<SessionRow>) =>
    setSessions((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const addSession = () =>
    setSessions((prev) => [
      ...prev,
      {
        key: `s${Date.now()}`,
        weekday: 1,
        start_time: "15:40",
        end_time: "16:40",
      },
    ]);

  const removeSession = (key: string) =>
    setSessions((prev) => prev.filter((s) => s.key !== key));

  const sessionsJson = JSON.stringify(
    sessions.map((s) => ({
      weekday: s.weekday,
      start_time: s.start_time || null,
      end_time: s.end_time || null,
    })),
  );

  return (
    <form action={formAction} className="rounded-2xl border-2 border-nil-300 bg-white p-4">
      {club && <input type="hidden" name="club_id" value={club.id} />}
      <input type="hidden" name="sessions" value={sessionsJson} />

      {/* --- Нэр --- */}
      <div>
        <label htmlFor="name" className="block text-sm font-bold text-nil-800">
          Дугуйлангийн нэр
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={club?.name ?? ""}
          className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-nil-300 px-3"
        />
      </div>

      {/* --- Түвшин --- */}
      <div className="mt-4">
        <label htmlFor="level" className="block text-sm font-bold text-nil-800">
          Түвшин
        </label>
        <select
          id="level"
          name="level"
          defaultValue={club?.level ?? "baga"}
          className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-nil-300 bg-white px-3"
        >
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {/* --- Хамрах анги --- */}
      <fieldset className="mt-4">
        <legend className="text-sm font-bold text-nil-800">Хамрах анги</legend>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {GRADES.map((g) => (
            <label
              key={g}
              className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 border-nil-300 px-2 text-sm font-bold text-nil-800 has-checked:border-nil-800 has-checked:bg-nil-100"
            >
              <input
                type="checkbox"
                name="grades"
                value={g}
                defaultChecked={club?.grades.includes(g) ?? false}
                className="h-4 w-4 accent-nil-800"
              />
              {g}
            </label>
          ))}
        </div>
      </fieldset>

      {/* --- Өрөө, багш --- */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="room" className="block text-sm font-bold text-nil-800">
            Өрөө
          </label>
          <input
            id="room"
            name="room"
            type="text"
            defaultValue={club?.room ?? ""}
            className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-nil-300 px-3"
          />
        </div>
        <div>
          <label htmlFor="teacher" className="block text-sm font-bold text-nil-800">
            Багш
          </label>
          <input
            id="teacher"
            name="teacher"
            type="text"
            defaultValue={club?.teacher ?? ""}
            className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-nil-300 px-3"
          />
        </div>
      </div>

      {/* --- Суудлын хязгаар --- */}
      <fieldset className="mt-4">
        <legend className="text-sm font-bold text-nil-800">Суудлын хязгаар</legend>
        <label className="mt-2 flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            checked={unlimited}
            onChange={(e) => setUnlimited(e.target.checked)}
            className="h-5 w-5 accent-nil-800"
          />
          <span className="text-sm text-nil-800">Хязгааргүй</span>
        </label>

        {!unlimited && (
          <input
            name="capacity"
            type="number"
            min={1}
            defaultValue={club?.capacity ?? 15}
            aria-label="Суудлын тоо"
            className="mt-2 min-h-12 w-32 rounded-xl border-2 border-nil-300 px-3"
          />
        )}
      </fieldset>

      {/* --- Бүртгэл нээлттэй эсэх --- */}
      <label className="mt-4 flex min-h-12 items-center gap-3">
        <input
          type="checkbox"
          name="is_open"
          defaultChecked={club?.is_open ?? true}
          className="h-5 w-5 accent-nil-800"
        />
        <span className="text-sm font-bold text-nil-800">Бүртгэл нээлттэй</span>
      </label>

      {/* --- Хичээлийн цаг (олон байж болно) --- */}
      <fieldset className="mt-4">
        <legend className="text-sm font-bold text-nil-800">
          Хичээлийн цаг
          <span className="ml-1 font-normal text-nil-600">
            (7 хоногт хэд удаа ч байж болно)
          </span>
        </legend>

        <ul className="mt-2 space-y-2">
          {sessions.map((s) => (
            <li
              key={s.key}
              className="rounded-xl border-2 border-nil-100 p-3"
            >
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-xs text-nil-600">Гараг</label>
                  <select
                    value={s.weekday ?? ""}
                    onChange={(e) =>
                      updateSession(s.key, {
                        weekday: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="mt-1 min-h-12 rounded-xl border-2 border-nil-300 bg-white px-2"
                  >
                    <option value="">Тодорхойгүй</option>
                    {WEEKDAYS.slice(0, 5).map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-nil-600">Эхлэх</label>
                  <input
                    type="time"
                    value={s.start_time}
                    disabled={s.weekday == null}
                    onChange={(e) => updateSession(s.key, { start_time: e.target.value })}
                    className="mt-1 min-h-12 rounded-xl border-2 border-nil-300 px-2 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs text-nil-600">Дуусах</label>
                  <input
                    type="time"
                    value={s.end_time}
                    disabled={s.weekday == null}
                    onChange={(e) => updateSession(s.key, { end_time: e.target.value })}
                    className="mt-1 min-h-12 rounded-xl border-2 border-nil-300 px-2 disabled:opacity-50"
                  />
                </div>

                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSession(s.key)}
                    className="min-h-12 rounded-xl border-2 border-anhaar-600 px-3 text-sm font-bold text-anhaar-700"
                  >
                    Хасах
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={addSession}
          className="mt-2 min-h-12 rounded-xl border-2 border-nil-600 px-4 text-sm font-bold text-nil-800"
        >
          + Цаг нэмэх
        </button>
      </fieldset>

      {state && (
        <p
          className={`mt-4 text-sm font-bold ${state.ok ? "text-nil-800" : "text-anhaar-600"}`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 min-h-13 w-full rounded-xl bg-nil-800 px-4 py-3 text-base font-bold text-white disabled:opacity-60"
      >
        {pending ? "Хадгалж байна..." : submitLabel}
      </button>
    </form>
  );
}
