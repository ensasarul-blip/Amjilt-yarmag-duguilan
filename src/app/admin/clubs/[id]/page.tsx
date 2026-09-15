import Link from "next/link";
import { notFound } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import ClubForm from "@/components/admin/ClubForm";
import { ErrorNotice, SetupNotice } from "@/components/Notice";
import {
  cancelRegistrationAction,
  deleteClubAction,
  promoteRegistrationAction,
  toggleClubOpenAction,
  updateClubAction,
} from "@/app/admin/actions";
import { levelName } from "@/lib/constants";
import {
  formatDateTime,
  formatGradesLabel,
  formatPhone,
  formatSession,
  sortSessions,
} from "@/lib/format";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import type { Club, ClubSession, ClubView, SeatCount } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  student_name: string;
  grade: number;
  class_group: string;
  parent_phone: string;
  status: "registered" | "waitlisted";
  created_at: string;
  queue_position: number;
};

type CancelledRow = {
  id: string;
  student_name: string;
  class_group: string;
  parent_phone: string;
  cancelled_at: string | null;
};

function StudentTable({
  rows,
  clubId,
  kind,
}: {
  rows: Row[];
  clubId: string;
  kind: "registered" | "waitlisted";
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-2 text-sm text-nil-600">
        {kind === "registered"
          ? "Бүртгүүлсэн сурагч алга."
          : "Хүлээлгийн жагсаалт хоосон."}
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2">
      {rows.map((r) => (
        <li key={r.id} className="rounded-xl border-2 border-nil-100 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-nil-900">
                <span className="mr-2 inline-block min-w-6 rounded bg-nil-100 px-1.5 text-center text-sm text-nil-800">
                  {r.queue_position}
                </span>
                {r.student_name}
              </p>
              <p className="mt-1 text-sm text-nil-800">
                {r.class_group} •{" "}
                <a href={`tel:${r.parent_phone}`} className="underline">
                  {formatPhone(r.parent_phone)}
                </a>
              </p>
              <p className="mt-0.5 text-xs text-nil-600">
                {formatDateTime(r.created_at)}
              </p>
            </div>

            <div className="no-print flex shrink-0 flex-col gap-2">
              {kind === "waitlisted" && (
                <form action={promoteRegistrationAction}>
                  <input type="hidden" name="registration_id" value={r.id} />
                  <input type="hidden" name="club_id" value={clubId} />
                  <button
                    type="submit"
                    className="min-h-11 w-full rounded-xl bg-nil-600 px-3 text-sm font-bold text-white"
                  >
                    Бүртгэлд оруулах
                  </button>
                </form>
              )}
              <form action={cancelRegistrationAction}>
                <input type="hidden" name="registration_id" value={r.id} />
                <input type="hidden" name="club_id" value={clubId} />
                <button
                  type="submit"
                  className="min-h-11 w-full rounded-xl border-2 border-anhaar-600 px-3 text-sm font-bold text-anhaar-700"
                >
                  Цуцлах
                </button>
              </form>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!supabaseConfigured()) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <SetupNotice />
      </main>
    );
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [clubRes, sessionsRes, seatsRes, regsRes, cancelledRes] = await Promise.all([
    supabase.from("clubs").select("*").eq("id", id).maybeSingle(),
    supabase.from("club_sessions").select("*").eq("club_id", id),
    supabase.from("club_seat_counts").select("*").eq("club_id", id).maybeSingle(),
    supabase
      .from("registrations_with_position")
      .select("id, student_name, grade, class_group, parent_phone, status, created_at, queue_position")
      .eq("club_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("registrations")
      .select("id, student_name, class_group, parent_phone, cancelled_at")
      .eq("club_id", id)
      .eq("status", "cancelled")
      .order("cancelled_at", { ascending: false }),
  ]);

  const firstError = clubRes.error ?? sessionsRes.error ?? regsRes.error;
  if (firstError) {
    return (
      <>
        <AdminHeader email={user?.email} />
        <main className="mx-auto max-w-3xl px-4 py-6">
          <ErrorNotice message={firstError.message} />
        </main>
      </>
    );
  }

  if (!clubRes.data) notFound();

  const seat = seatsRes.data as SeatCount | null;
  const club: ClubView = {
    ...(clubRes.data as Club),
    sessions: (sessionsRes.data ?? []) as ClubSession[],
    registered: seat?.registered_count ?? 0,
    waitlisted: seat?.waitlist_count ?? 0,
  };

  const allRows = (regsRes.data ?? []) as Row[];
  const registered = allRows.filter((r) => r.status === "registered");
  const waitlisted = allRows.filter((r) => r.status === "waitlisted");
  const cancelled = (cancelledRes.data ?? []) as CancelledRow[];

  const limited = club.capacity != null;
  const isFull = limited && club.registered >= club.capacity!;

  return (
    <>
      <AdminHeader email={user?.email} />

      <main className="mx-auto max-w-3xl px-4 py-5">
        <Link href="/admin" className="no-print text-sm font-bold text-nil-800 underline">
          ← Хяналтын самбар
        </Link>

        {/* ---------- Дугуйлангийн мэдээлэл ---------- */}
        <section className="mt-3 rounded-2xl border-2 border-nil-300 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-nil-900">{club.name}</h2>
              <p className="mt-0.5 text-sm text-nil-600">
                {formatGradesLabel(club.grades)} • {levelName(club.level)}
              </p>
            </div>
            {isFull && (
              <span className="shrink-0 rounded-lg bg-anhaar-600 px-2.5 py-1 text-xs font-bold text-white">
                ДҮҮРСЭН
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-nil-800">
            {sortSessions(club.sessions).map(formatSession).join(" • ")}
          </p>
          <p className="mt-0.5 text-sm text-nil-600">
            {[club.room, club.teacher].filter(Boolean).join(" • ") || "—"}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-nil-100 p-2.5 text-center">
              <p className="text-xs text-nil-600">Бүртгэгдсэн</p>
              <p className="text-xl font-bold text-nil-900">
                {club.registered}
                {limited && (
                  <span className="text-sm font-normal"> / {club.capacity}</span>
                )}
              </p>
            </div>
            <div className="rounded-xl bg-nil-100 p-2.5 text-center">
              <p className="text-xs text-nil-600">Хүлээлэг</p>
              <p className="text-xl font-bold text-nil-900">{club.waitlisted}</p>
            </div>
            <div className="rounded-xl bg-nil-100 p-2.5 text-center">
              <p className="text-xs text-nil-600">Цуцалсан</p>
              <p className="text-xl font-bold text-nil-900">{cancelled.length}</p>
            </div>
          </div>

          <form action={toggleClubOpenAction} className="no-print mt-3">
            <input type="hidden" name="club_id" value={club.id} />
            <input type="hidden" name="next_open" value={String(!club.is_open)} />
            <button
              type="submit"
              className="min-h-12 w-full rounded-xl border-2 border-nil-600 px-4 text-sm font-bold text-nil-800"
            >
              {club.is_open ? "Бүртгэлийг хаах" : "Бүртгэлийг нээх"}
            </button>
          </form>
        </section>

        {/* ---------- Бүртгэгдсэн ---------- */}
        <section className="mt-4 rounded-2xl border-2 border-nil-300 bg-white p-4">
          <h3 className="text-base font-bold text-nil-900">
            Бүртгэгдсэн сурагчид ({registered.length})
          </h3>
          <StudentTable rows={registered} clubId={club.id} kind="registered" />
        </section>

        {/* ---------- Хүлээлэг ---------- */}
        <section className="mt-4 rounded-2xl border-2 border-nil-300 bg-white p-4">
          <h3 className="text-base font-bold text-nil-900">
            Хүлээлгийн жагсаалт ({waitlisted.length})
          </h3>
          <StudentTable rows={waitlisted} clubId={club.id} kind="waitlisted" />
        </section>

        {/* ---------- Цуцалсан ---------- */}
        {cancelled.length > 0 && (
          <details className="no-print mt-4 rounded-2xl border-2 border-nil-300 bg-white">
            <summary className="cursor-pointer list-none p-4 text-base font-bold text-nil-900">
              Цуцлагдсан бүртгэл ({cancelled.length})
            </summary>
            <ul className="border-t-2 border-nil-100 p-4 pt-3">
              {cancelled.map((c) => (
                <li key={c.id} className="border-b border-nil-100 py-2 last:border-b-0">
                  <p className="text-sm text-nil-800">
                    {c.student_name} • {c.class_group} • {formatPhone(c.parent_phone)}
                  </p>
                  <p className="text-xs text-nil-600">
                    {formatDateTime(c.cancelled_at)}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* ---------- Засах ---------- */}
        <details className="no-print mt-4 rounded-2xl border-2 border-nil-300 bg-white">
          <summary className="cursor-pointer list-none p-4 text-base font-bold text-nil-900">
            ✎ Дугуйлан засах
          </summary>
          <div className="border-t-2 border-nil-100 p-4">
            <ClubForm club={club} action={updateClubAction} submitLabel="Хадгалах" />

            <form action={deleteClubAction} className="mt-5 border-t-2 border-nil-100 pt-4">
              <input type="hidden" name="club_id" value={club.id} />
              <p className="text-sm text-anhaar-700">
                ⚠ Дугуйланг устгавал түүний {allRows.length + cancelled.length}{" "}
                бүртгэл ч мөн бүрмөсөн устана.
              </p>
              <button
                type="submit"
                className="mt-2 min-h-12 w-full rounded-xl border-2 border-anhaar-600 px-4 text-sm font-bold text-anhaar-700"
              >
                Дугуйланг устгах
              </button>
            </form>
          </div>
        </details>
      </main>
    </>
  );
}
