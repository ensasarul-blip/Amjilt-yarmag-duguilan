"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DB_ERROR_MESSAGE, GRADES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { cleanName, isValidName } from "@/lib/validation";
import type { ClassGroup, MyRegistration } from "@/lib/types";

function dbMessage(message: string): string {
  const code = Object.keys(DB_ERROR_MESSAGE).find((k) => message.includes(k));
  return code ? DB_ERROR_MESSAGE[code] : message;
}

export default function MyRegistrations({ groups }: { groups: ClassGroup[] }) {
  const [grade, setGrade] = useState<number | "">("");
  const [classGroup, setClassGroup] = useState("");
  const [studentName, setStudentName] = useState("");

  const [rows, setRows] = useState<MyRegistration[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const availableGroups = useMemo(
    () => (grade === "" ? [] : groups.filter((g) => g.grade === grade)),
    [groups, grade],
  );

  /** Зөвхөн жагсаалтыг дахин уншина — мэдэгдлийг хөндөхгүй */
  const runSearch = async () => {
    setError(null);
    setConfirmingId(null);

    if (!isValidName(studentName)) {
      setError("Сурагчийн овог нэрийг бүтнээр нь бичнэ үү.");
      return;
    }
    if (grade === "" || !classGroup) {
      setError("Анги болон бүлгээ сонгоно уу.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("find_my_registrations", {
        p_grade: grade,
        p_class_group: classGroup,
        p_student_name: cleanName(studentName),
      });

      if (rpcError) {
        setError(dbMessage(rpcError.message));
        return;
      }
      setRows((data ?? []) as MyRegistration[]);
    } catch (err) {
      setError(`Сүлжээний алдаа: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setNotice(null);
    await runSearch();
  };

  const cancel = async (registrationId: string) => {
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("cancel_my_registration", {
        p_registration_id: registrationId,
        p_grade: grade,
        p_class_group: classGroup,
        p_student_name: cleanName(studentName),
      });

      if (rpcError) {
        setError(dbMessage(rpcError.message));
        return;
      }

      const result = data as { promoted_student_name?: string | null } | null;
      setNotice(
        result?.promoted_student_name
          ? `Бүртгэл цуцлагдлаа. Хүлээлгийн жагсаалтаас ${result.promoted_student_name} автоматаар бүртгэгдлээ.`
          : "Бүртгэл цуцлагдлаа.",
      );
      setConfirmingId(null);
      await runSearch();
    } catch (err) {
      setError(`Сүлжээний алдаа: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* --- Хайх форм --- */}
      <form onSubmit={search} className="rounded-xl border-2 border-nil-300 bg-white p-4">
        <h2 className="text-lg font-bold text-nil-900">Бүртгэлээ хайх</h2>
        <p className="mt-1 text-sm text-nil-600">
          Бүртгүүлэхдээ оруулсан анги, бүлэг, нэрээ яг таг бичнэ үү.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="my-grade" className="block text-sm font-bold text-nil-800">
              Анги
            </label>
            <select
              id="my-grade"
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value === "" ? "" : Number(e.target.value));
                setClassGroup("");
                setRows(null);
              }}
              className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-nil-300 bg-white px-3"
            >
              <option value="">Сонгох</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}-р анги
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="my-group" className="block text-sm font-bold text-nil-800">
              Бүлэг
            </label>
            <select
              id="my-group"
              value={classGroup}
              onChange={(e) => {
                setClassGroup(e.target.value);
                setRows(null);
              }}
              disabled={grade === ""}
              className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-nil-300 bg-white px-3 disabled:opacity-50"
            >
              <option value="">{grade === "" ? "Эхлээд анги" : "Сонгох"}</option>
              {availableGroups.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label htmlFor="my-name" className="block text-sm font-bold text-nil-800">
            Сурагчийн овог нэр
          </label>
          <input
            id="my-name"
            type="text"
            value={studentName}
            onChange={(e) => {
              setStudentName(e.target.value);
              setRows(null);
            }}
            placeholder="Жишээ: Батын Болд"
            className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-nil-300 px-3 placeholder:text-nil-300"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 min-h-13 w-full rounded-xl bg-nil-800 px-4 py-3 text-base font-bold text-white disabled:opacity-60"
        >
          {loading ? "Хайж байна..." : "Хайх"}
        </button>

        {error && (
          <p role="alert" className="mt-3 text-sm font-bold text-anhaar-600">
            {error}
          </p>
        )}
      </form>

      {notice && (
        <p className="rounded-xl border-2 border-nil-600 bg-white p-4 text-sm font-bold text-nil-800">
          {notice}
        </p>
      )}

      {/* --- Үр дүн --- */}
      {rows !== null && (
        <section className="rounded-xl border-2 border-nil-300 bg-white p-4">
          <h2 className="text-lg font-bold text-nil-900">
            Бүртгэл ({rows.length})
          </h2>

          {rows.length === 0 ? (
            <p className="mt-2 text-sm text-nil-600">
              Бүртгэл олдсонгүй. Нэр, анги, бүлгээ шалгаад дахин оролдоно уу.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {rows.map((r) => (
                <li
                  key={r.registration_id}
                  className="rounded-xl border-2 border-nil-100 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-nil-900">{r.club_name}</p>
                      <p className="mt-0.5 text-sm text-nil-600">
                        {[r.room, r.teacher].filter(Boolean).join(" • ") || "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-nil-600">
                        {formatDateTime(r.created_at)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
                        r.status === "registered"
                          ? "bg-nil-800 text-white"
                          : "bg-nil-100 text-nil-800"
                      }`}
                    >
                      {r.status === "registered"
                        ? "Бүртгэгдсэн"
                        : `Хүлээлэг ${r.queue_position}-р`}
                    </span>
                  </div>

                  {confirmingId === r.registration_id ? (
                    <div className="mt-3 rounded-xl border-2 border-anhaar-600 bg-anhaar-100 p-3">
                      <p className="text-sm font-bold text-anhaar-700">
                        {r.club_name} дугуйлангийн бүртгэлийг цуцлах уу?
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => cancel(r.registration_id)}
                          disabled={loading}
                          className="min-h-12 flex-1 rounded-xl bg-anhaar-600 px-3 text-sm font-bold text-white disabled:opacity-60"
                        >
                          Тийм, цуцлах
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="min-h-12 flex-1 rounded-xl border-2 border-nil-600 bg-white px-3 text-sm font-bold text-nil-800"
                        >
                          Болих
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(r.registration_id)}
                      className="mt-3 min-h-12 w-full rounded-xl border-2 border-anhaar-600 bg-white px-3 text-sm font-bold text-anhaar-700"
                    >
                      Бүртгэл цуцлах
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/"
            className="mt-4 block text-center text-sm font-bold text-nil-800 underline"
          >
            Шинээр бүртгүүлэх
          </Link>
        </section>
      )}
    </div>
  );
}
