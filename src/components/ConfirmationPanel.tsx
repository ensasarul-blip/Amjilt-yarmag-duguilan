import Link from "next/link";
import { STATUS_LABEL } from "@/lib/constants";
import { formatDateTime, formatPhone } from "@/lib/format";
import type { ConfirmationPayload, RegisterResult } from "@/lib/types";

function Row({ r, showPosition }: { r: RegisterResult; showPosition?: boolean }) {
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-nil-100 py-2.5 last:border-b-0">
      <span className="font-bold text-nil-900">{r.club_name ?? "—"}</span>
      {showPosition && r.position != null && (
        <span className="shrink-0 rounded-lg bg-nil-100 px-2 py-0.5 text-sm font-bold text-nil-800">
          {r.position}-р дугаарт
        </span>
      )}
    </li>
  );
}

/**
 * Баталгаажуулах дэлгэц.
 * Бүртгэгдсэн ба хүлээлгийн жагсаалтад орсныг ТУСАД НЬ харуулна.
 */
export default function ConfirmationPanel({
  payload,
}: {
  payload: ConfirmationPayload;
}) {
  const registered = payload.results.filter((r) => r.status === "registered");
  const waitlisted = payload.results.filter((r) => r.status === "waitlisted");
  const others = payload.results.filter(
    (r) => r.status !== "registered" && r.status !== "waitlisted",
  );

  const allFailed = registered.length === 0 && waitlisted.length === 0;

  return (
    <div className="space-y-5">
      {/* --- Толгой --- */}
      <div
        className={`rounded-xl border-2 p-5 text-center ${
          allFailed
            ? "border-anhaar-600 bg-anhaar-100"
            : "border-nil-600 bg-white"
        }`}
      >
        <p className="text-4xl" aria-hidden="true">
          {allFailed ? "⚠" : "✓"}
        </p>
        <h2 className="mt-2 text-xl font-bold text-nil-900">
          {allFailed ? "Бүртгэл хийгдсэнгүй" : "Хүсэлт хүлээн авлаа"}
        </h2>
        <p className="mt-1 text-sm text-nil-600">
          {payload.studentName} • {payload.classGroup} •{" "}
          {formatPhone(payload.phone)}
        </p>
        <p className="mt-0.5 text-xs text-nil-600">
          {formatDateTime(payload.at)}
        </p>
      </div>

      {/* --- Бүртгэгдсэн --- */}
      {registered.length > 0 && (
        <section className="rounded-xl border-2 border-nil-600 bg-white p-4">
          <h3 className="text-base font-bold text-nil-900">
            ✓ Бүртгэгдсэн дугуйлан ({registered.length})
          </h3>
          <ul className="mt-2">
            {registered.map((r) => (
              <Row key={r.club_id} r={r} />
            ))}
          </ul>
        </section>
      )}

      {/* --- Хүлээлгийн жагсаалт --- */}
      {waitlisted.length > 0 && (
        <section className="rounded-xl border-2 border-nil-300 bg-white p-4">
          <h3 className="text-base font-bold text-nil-900">
            ⏳ Хүлээлгийн жагсаалт ({waitlisted.length})
          </h3>
          <p className="mt-1 text-sm text-nil-600">
            Суудал дүүрсэн тул хүлээлгийн жагсаалтад орлоо. Хэн нэгний бүртгэл
            цуцлагдвал дарааллын дагуу автоматаар бүртгэгдэнэ.
          </p>
          <ul className="mt-2">
            {waitlisted.map((r) => (
              <Row key={r.club_id} r={r} showPosition />
            ))}
          </ul>
        </section>
      )}

      {/* --- Бусад тохиолдол --- */}
      {others.length > 0 && (
        <section className="rounded-xl border-2 border-anhaar-600 bg-anhaar-100 p-4">
          <h3 className="text-base font-bold text-anhaar-700">
            Бүртгэгдээгүй дугуйлан
          </h3>
          <ul className="mt-2 space-y-1.5">
            {others.map((r) => (
              <li key={r.club_id} className="text-sm text-anhaar-700">
                • <span className="font-bold">{r.club_name ?? "—"}</span>{" "}
                — {STATUS_LABEL[r.status] ?? r.status}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- Товчнууд --- */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/burtgel"
          className="min-h-13 flex-1 rounded-xl border-2 border-nil-600 bg-white px-4 py-3 text-center text-base font-bold text-nil-800"
        >
          Миний бүртгэл
        </Link>
        <Link
          href="/"
          className="min-h-13 flex-1 rounded-xl bg-nil-800 px-4 py-3 text-center text-base font-bold text-white"
        >
          Нүүр хуудас
        </Link>
      </div>
    </div>
  );
}
