import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import SettingsPanel from "@/components/admin/SettingsPanel";
import { ErrorNotice, SetupNotice } from "@/components/Notice";
import { GRADES, LEVELS, WEEKDAYS } from "@/lib/constants";
import { formatGrades, formatSession, sortSessions } from "@/lib/format";
import { loadPublicData } from "@/lib/data";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import type { ClubView } from "@/lib/types";

export const dynamic = "force-dynamic";

type Search = { level?: string; weekday?: string; grade?: string };

function applyFilters(clubs: ClubView[], f: Search): ClubView[] {
  return clubs.filter((c) => {
    if (f.level && c.level !== f.level) return false;
    if (f.grade && !c.grades.includes(Number(f.grade))) return false;
    if (f.weekday) {
      const wd = Number(f.weekday);
      if (!c.sessions.some((s) => s.weekday === wd)) return false;
    }
    return true;
  });
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!supabaseConfigured()) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <SetupNotice />
      </main>
    );
  }

  const filters = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await loadPublicData();
  if (!data.ok) {
    return (
      <>
        <AdminHeader email={user?.email} />
        <main className="mx-auto max-w-5xl px-4 py-6">
          <ErrorNotice message={data.error} />
        </main>
      </>
    );
  }

  const filtered = applyFilters(data.clubs, filters);

  const totals = data.clubs.reduce(
    (acc, c) => {
      acc.registered += c.registered;
      acc.waitlisted += c.waitlisted;
      if (c.capacity != null) {
        acc.limited += 1;
        if (c.registered >= c.capacity) acc.full += 1;
      }
      return acc;
    },
    { registered: 0, waitlisted: 0, limited: 0, full: 0 },
  );

  const hasFilter = Boolean(filters.level || filters.grade || filters.weekday);

  return (
    <>
      <AdminHeader email={user?.email} />

      <main className="mx-auto max-w-5xl px-4 py-5">
        {/* ---------- Товч тоо (нэг авсаархан мөр) ---------- */}
        <section className="grid grid-cols-4 divide-x-2 divide-nil-100 rounded-xl border-2 border-nil-300 bg-white">
          {[
            { label: "Дугуйлан", value: String(data.clubs.length) },
            { label: "Бүртгэл", value: String(totals.registered) },
            { label: "Хүлээлэг", value: String(totals.waitlisted) },
            { label: "Дүүрсэн", value: `${totals.full}/${totals.limited}` },
          ].map((s) => (
            <div key={s.label} className="px-1 py-2.5 text-center">
              <p className="text-xl leading-none font-bold text-nil-900 tabular-nums">
                {s.value}
              </p>
              <p className="mt-1 text-[11px] text-nil-600">{s.label}</p>
            </div>
          ))}
        </section>

        {/* ---------- Тохиргоо ---------- */}
        <div className="mt-3">
          <SettingsPanel settings={data.settings} />
        </div>

        {/* ---------- Шүүлтүүр ---------- */}
        <details
          open={hasFilter}
          className="mt-3 rounded-xl border-2 border-nil-300 bg-white"
        >
          <summary className="cursor-pointer list-none p-3 text-sm font-bold text-nil-900">
            Шүүлтүүр
            {hasFilter && (
              <span className="ml-2 rounded bg-nil-100 px-1.5 py-0.5 text-xs font-normal text-nil-800">
                идэвхтэй
              </span>
            )}
          </summary>

          <form method="get" className="border-t-2 border-nil-100 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="f-level" className="block text-sm font-bold text-nil-800">
                Түвшин
              </label>
              <select
                id="f-level"
                name="level"
                defaultValue={filters.level ?? ""}
                className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-nil-300 bg-white px-3"
              >
                <option value="">Бүгд</option>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-grade" className="block text-sm font-bold text-nil-800">
                Анги
              </label>
              <select
                id="f-grade"
                name="grade"
                defaultValue={filters.grade ?? ""}
                className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-nil-300 bg-white px-3"
              >
                <option value="">Бүгд</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}-р анги
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-weekday" className="block text-sm font-bold text-nil-800">
                Гараг
              </label>
              <select
                id="f-weekday"
                name="weekday"
                defaultValue={filters.weekday ?? ""}
                className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-nil-300 bg-white px-3"
              >
                <option value="">Бүгд</option>
                {WEEKDAYS.slice(0, 5).map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="min-h-12 flex-1 rounded-xl bg-nil-800 px-4 text-sm font-bold text-white"
              >
                Шүүх
              </button>
              {hasFilter && (
                <Link
                  href="/admin"
                  className="flex min-h-12 items-center rounded-xl border-2 border-nil-300 px-4 text-sm font-bold text-nil-800"
                >
                  Цэвэрлэх
                </Link>
              )}
            </div>
          </div>
          </form>
        </details>

        {/* ---------- Дугуйлангийн жагсаалт ---------- */}
        <p className="mt-4 text-sm text-nil-600">
          {filtered.length} дугуйлан харагдаж байна
          {hasFilter ? ` (нийт ${data.clubs.length})` : ""}
        </p>

        <ul className="mt-2 space-y-2.5">
          {filtered.map((club) => {
            const limited = club.capacity != null;
            const isFull = limited && club.registered >= club.capacity!;
            const percent = limited
              ? Math.min(100, Math.round((club.registered / club.capacity!) * 100))
              : 0;

            return (
              <li key={club.id}>
                <Link
                  href={`/admin/clubs/${club.id}`}
                  className="block rounded-xl border-2 border-nil-300 bg-white p-3 transition-colors hover:border-nil-600"
                >
                  <div className="flex items-baseline gap-2">
                    <p className="min-w-0 flex-1 truncate text-base font-bold text-nil-900">
                      {club.name}
                      <span className="ml-1.5 text-xs font-normal text-nil-600">
                        {formatGrades(club.grades)}-р анги
                      </span>
                    </p>

                    {isFull && (
                      <span className="shrink-0 rounded-md bg-anhaar-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                        ДҮҮРСЭН
                      </span>
                    )}
                    {!club.is_open && (
                      <span className="shrink-0 rounded-md bg-nil-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                        ХААЛТТАЙ
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 truncate text-sm text-nil-600">
                    {[
                      sortSessions(club.sessions).map(formatSession).join(" · "),
                      club.room,
                      club.teacher,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>

                  <div className="mt-1.5 flex items-center gap-2">
                    {limited ? (
                      <>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-nil-100">
                          <div
                            className={`h-full rounded-full ${isFull ? "bg-anhaar-600" : "bg-nil-600"}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs font-bold text-nil-900 tabular-nums">
                          {club.registered} / {club.capacity}
                        </span>
                      </>
                    ) : (
                      <span className="flex-1 text-xs font-bold text-nil-900">
                        {club.registered} бүртгэл · хязгааргүй
                      </span>
                    )}
                    {club.waitlisted > 0 && (
                      <span className="shrink-0 rounded bg-nil-100 px-1.5 text-xs text-nil-800">
                        +{club.waitlisted}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {filtered.length === 0 && (
          <p className="mt-3 rounded-2xl border-2 border-dashed border-nil-300 bg-white p-6 text-center text-sm text-nil-600">
            Шүүлтүүрт тохирох дугуйлан олдсонгүй.
          </p>
        )}
      </main>
    </>
  );
}
