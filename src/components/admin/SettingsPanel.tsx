"use client";

import { useActionState } from "react";
import { updateSettingsAction, type ActionState } from "@/app/admin/actions";
import type { AppSettings } from "@/lib/types";

export default function SettingsPanel({ settings }: { settings: AppSettings }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateSettingsAction,
    null,
  );

  return (
    <details className="rounded-xl border-2 border-nil-300 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-bold text-nil-900">
        <span>Ерөнхий тохиргоо</span>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-normal ${
            settings.registration_open
              ? "bg-nil-100 text-nil-800"
              : "bg-anhaar-100 text-anhaar-700"
          }`}
        >
          {settings.registration_open ? "Бүртгэл нээлттэй" : "Бүртгэл хаалттай"} ·{" "}
          {settings.max_clubs_per_student} дугуйлан
        </span>
      </summary>

      <form action={formAction} className="border-t-2 border-nil-100 p-3">
        <label className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            name="registration_open"
            defaultChecked={settings.registration_open}
            className="h-5 w-5 accent-nil-800"
          />
          <span className="text-sm font-bold text-nil-800">
            Бүртгэл нээлттэй (бүх дугуйланд)
          </span>
        </label>

        <div className="mt-3">
          <label
            htmlFor="max_clubs"
            className="block text-sm font-bold text-nil-800"
          >
            Нэг сурагчийн авах дугуйлангийн дээд хязгаар
          </label>
          <input
            id="max_clubs"
            name="max_clubs_per_student"
            type="number"
            min={1}
            max={10}
            defaultValue={settings.max_clubs_per_student}
            className="mt-1.5 min-h-12 w-24 rounded-xl border-2 border-nil-300 px-3"
          />
        </div>

        <div className="mt-3">
          <label
            htmlFor="announcement"
            className="block text-sm font-bold text-nil-800"
          >
            Зарлал (нийтийн хуудсанд харагдана)
          </label>
          <textarea
            id="announcement"
            name="announcement"
            rows={2}
            defaultValue={settings.announcement ?? ""}
            className="mt-1.5 w-full rounded-xl border-2 border-nil-300 p-3"
          />
        </div>

        {state && (
          <p
            className={`mt-3 text-sm font-bold ${state.ok ? "text-nil-800" : "text-anhaar-600"}`}
          >
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-4 min-h-12 rounded-xl bg-nil-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Хадгалж байна..." : "Хадгалах"}
        </button>
      </form>
    </details>
  );
}
