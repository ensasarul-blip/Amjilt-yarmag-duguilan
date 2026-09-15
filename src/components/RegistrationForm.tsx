"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ClubCard from "./ClubCard";
import ConflictAlert from "./ConflictAlert";
import ConfirmationPanel from "./ConfirmationPanel";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CloseIcon,
  EditIcon,
  SearchIcon,
} from "./icons";
import { createClient } from "@/lib/supabase/client";
import { DB_ERROR_MESSAGE, GRADES } from "@/lib/constants";
import { formatSession } from "@/lib/format";
import { findConflicts } from "@/lib/overlap";
import { cleanName, isValidName, isValidPhone, normalizePhone } from "@/lib/validation";
import type {
  AppSettings,
  ClassGroup,
  ClubView,
  ConfirmationPayload,
  RegisterResult,
  SeatCount,
} from "@/lib/types";

type Seats = Record<string, { registered: number; waitlisted: number }>;

type Props = {
  clubs: ClubView[];
  groups: ClassGroup[];
  settings: AppSettings;
};

const CONFIRM_KEY = "amjilt:confirmation";

/** Дээд талын явцын заагч */
function StepBar({ step }: { step: 1 | 2 }) {
  const steps = [
    { n: 1, label: "Сурагчийн мэдээлэл" },
    { n: 2, label: "Дугуйлан сонгох" },
  ] as const;

  return (
    <ol className="mb-4 flex gap-2" aria-label="Бүртгэлийн явц">
      {steps.map((s) => {
        const done = step >= s.n;
        const current = step === s.n;
        return (
          <li key={s.n} className="flex-1" aria-current={current ? "step" : undefined}>
            <div className={`h-1.5 rounded-full ${done ? "bg-nil-800" : "bg-nil-300"}`} />
            <p
              className={`mt-1.5 text-xs ${
                current ? "font-bold text-nil-900" : "text-nil-600"
              }`}
            >
              {s.n}. {s.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export default function RegistrationForm({ clubs, groups, settings }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [grade, setGrade] = useState<number | "">("");
  const [classGroup, setClassGroup] = useState("");
  const [studentName, setStudentName] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [inlineResult, setInlineResult] = useState<ConfirmationPayload | null>(null);

  const [seats, setSeats] = useState<Seats>(() =>
    Object.fromEntries(
      clubs.map((c) => [c.id, { registered: c.registered, waitlisted: c.waitlisted }]),
    ),
  );

  const maxClubs = settings.max_clubs_per_student;

  // ------------------------------------------------------------------
  // БОДИТ ЦАГИЙН ШИНЭЧЛЭЛТ
  //
  //  1) Supabase Realtime — өөр хүн бүртгүүлэхэд тоо шууд өөрчлөгдөнө.
  //  2) Нөөц арга: /api/seats хаягаас давтан уншина. Энэ хаяг Vercel дээр
  //     5 секунд кешлэгддэг тул хэдэн зуун хүн зэрэг нээсэн ч өгөгдлийн
  //     санд ачаалал өгөхгүй.
  //
  //  ОЛОН ХҮН ЗЭРЭГ ОРОХ ҮЕД: Realtime холбогдож чадвал 45 секунд тутам,
  //  чадаагүй бол 12 секунд тутам уншина. Бүгд яг нэг агшинд дуудахаас
  //  сэргийлж санамсаргүй хугацаа (jitter) нэмнэ.
  // ------------------------------------------------------------------
  useEffect(() => {
    const supabase = createClient();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let realtimeOk = false;

    const applyRow = (row: SeatCount | null | undefined) => {
      if (!row?.club_id) return;
      setSeats((prev) => ({
        ...prev,
        [row.club_id]: {
          registered: row.registered_count,
          waitlisted: row.waitlist_count,
        },
      }));
    };

    const channel = supabase
      .channel("club-seat-counts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_seat_counts" },
        (payload) => applyRow(payload.new as SeatCount),
      )
      .subscribe((status) => {
        // Үнэгүй багцад зэрэг холбогдох тоо хязгаартай. Холбогдож чадаагүй
        // бол алдаа заахгүйгээр давтан уншилт руу шилжинэ.
        realtimeOk = status === "SUBSCRIBED";
      });

    const refetch = async () => {
      try {
        const res = await fetch("/api/seats");
        if (!res.ok) return;
        const json = (await res.json()) as {
          ok: boolean;
          seats?: Record<string, { r: number; w: number }>;
        };
        if (!json.ok || !json.seats || stopped) return;
        setSeats((prev) => {
          const next = { ...prev };
          for (const [id, v] of Object.entries(json.seats!)) {
            next[id] = { registered: v.r, waitlisted: v.w };
          }
          return next;
        });
      } catch {
        // Сүлжээ тасарсан — дараагийн удаа дахин оролдоно
      }
    };

    const schedule = () => {
      const base = realtimeOk ? 45_000 : 12_000;
      const jitter = Math.random() * base * 0.4; // 800 хөтөч нэг дор дуудахгүй
      timer = setTimeout(async () => {
        if (stopped) return;
        // Таб далд байвал уншихгүй — утасны батерей, сүлжээг хэмнэнэ
        if (document.visibilityState === "visible") await refetch();
        schedule();
      }, base + jitter);
    };
    schedule();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  // ------------------------------------------------------------------
  // Дэлгэцэд харагдах өгөгдөл
  // ------------------------------------------------------------------
  const liveClubs = useMemo<ClubView[]>(
    () =>
      clubs.map((c) => ({
        ...c,
        registered: seats[c.id]?.registered ?? c.registered,
        waitlisted: seats[c.id]?.waitlisted ?? c.waitlisted,
      })),
    [clubs, seats],
  );

  const availableGroups = useMemo(
    () => (grade === "" ? [] : groups.filter((g) => g.grade === grade)),
    [groups, grade],
  );

  /** Анги сонгоход ЗӨВХӨН тухайн ангид хамаарах дугуйлан гарна */
  const gradeClubs = useMemo(
    () => (grade === "" ? [] : liveClubs.filter((c) => c.grades.includes(grade))),
    [liveClubs, grade],
  );

  /** Нэр, багш, өрөө, гараг цагаар хайна */
  const visibleClubs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return gradeClubs;
    return gradeClubs.filter((c) =>
      [c.name, c.teacher ?? "", c.room ?? "", ...c.sessions.map(formatSession)]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [gradeClubs, query]);

  const selectedClubs = useMemo(
    () => selected.map((id) => liveClubs.find((c) => c.id === id)).filter(Boolean) as ClubView[],
    [selected, liveClubs],
  );

  const conflicts = useMemo(
    () =>
      findConflicts(
        selectedClubs.map((c) => ({ id: c.id, name: c.name, sessions: c.sessions })),
      ),
    [selectedClubs],
  );

  const conflictIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of conflicts) {
      set.add(c.clubAId);
      set.add(c.clubBId);
    }
    return set;
  }, [conflicts]);

  // ------------------------------------------------------------------
  // Үйлдэл
  // ------------------------------------------------------------------
  const handleGradeChange = (value: string) => {
    const next = value === "" ? "" : Number(value);
    setGrade(next);
    setClassGroup("");
    setSelected([]); // анги солигдвол сонголт хүчингүй
    setFormError(null);
  };

  const toggleClub = useCallback(
    (clubId: string) => {
      setFormError(null);
      setSelected((prev) => {
        if (prev.includes(clubId)) return prev.filter((id) => id !== clubId);
        if (prev.length >= maxClubs) return prev;
        return [...prev, clubId];
      });
    },
    [maxClubs],
  );

  const step1Problem = (): string | null => {
    if (!isValidName(studentName)) return "Сурагчийн овог нэрийг бүтнээр нь бичнэ үү.";
    if (grade === "") return "Ангиа сонгоно уу.";
    if (!classGroup) return "Бүлгээ сонгоно уу.";
    if (!isValidPhone(phone)) return "Утасны дугаар яг 8 оронтой байх ёстой.";
    return null;
  };

  const goToStep2 = () => {
    setTouched(true);
    const problem = step1Problem();
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    setStep(2);
    window.scrollTo({ top: 0 });
  };

  const backToStep1 = () => {
    setFormError(null);
    setStep(1);
    window.scrollTo({ top: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const problem = step1Problem();
    if (problem) {
      setFormError(problem);
      setStep(1);
      window.scrollTo({ top: 0 });
      return;
    }
    if (selected.length === 0) {
      setFormError("Дор хаяж нэг дугуйлан сонгоно уу.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const supabase = createClient();
      const args = {
        p_student_name: cleanName(studentName),
        p_grade: grade,
        p_class_group: classGroup,
        p_parent_phone: normalizePhone(phone),
        p_club_ids: selected,
      };

      // ОЛОН ХҮН ЗЭРЭГ БҮРТГҮҮЛЭХ ҮЕД: сервер түр завгүй байж болзошгүй.
      // Ийм түр зуурын саатал гарвал 3 хүртэл удаа өөрөө дахин оролдоно —
      // эцэг эх дахин товч дарах шаардлагагүй.
      // (Давхар бүртгэлээс өгөгдлийн сангийн давтагдашгүй индекс сэргийлдэг
      //  тул дахин оролдоход эрсдэлгүй.)
      let data: unknown = null;
      let error: { message: string } | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await supabase.rpc("register_student", args);
        data = res.data;
        error = res.error;
        if (!error) break;

        const msg = error.message ?? "";
        const temporary =
          /timeout|timed out|fetch|network|too many|unavailable|503|504|57014|53300|40001/i.test(
            msg,
          );
        if (!temporary || attempt === 2) break;

        // 0.6 сек, дараа нь 1.8 сек хүлээгээд дахин оролдоно
        await new Promise((r) => setTimeout(r, 600 * Math.pow(3, attempt)));
      }

      if (error) {
        const code = Object.keys(DB_ERROR_MESSAGE).find((k) => error.message.includes(k));
        setFormError(code ? DB_ERROR_MESSAGE[code] : `Бүртгэхэд алдаа гарлаа: ${error.message}`);
        return;
      }

      const payload: ConfirmationPayload = {
        studentName: cleanName(studentName),
        grade: grade as number,
        classGroup,
        phone: normalizePhone(phone),
        results: (data ?? []) as RegisterResult[],
        at: new Date().toISOString(),
      };

      try {
        sessionStorage.setItem(CONFIRM_KEY, JSON.stringify(payload));
        router.push("/amjilt");
      } catch {
        setInlineResult(payload);
        window.scrollTo({ top: 0 });
      }
    } catch (err) {
      setFormError(`Сүлжээний алдаа гарлаа. Дахин оролдоно уу. (${(err as Error).message})`);
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------------
  // Дэлгэц
  // ------------------------------------------------------------------
  if (inlineResult) return <ConfirmationPanel payload={inlineResult} />;

  if (!settings.registration_open) {
    return (
      <div className="rounded-2xl border-2 border-nil-300 bg-white p-6 text-center">
        <p className="text-lg font-bold text-nil-900">Бүртгэл хаалттай байна</p>
        <p className="mt-2 text-sm text-nil-600">
          {settings.announcement ?? "Бүртгэл нээгдэх үед энэ хуудсаар дамжуулан зарлана."}
        </p>
      </div>
    );
  }

  const nameInvalid = touched && !isValidName(studentName);
  const phoneInvalid = touched && !isValidPhone(phone);
  const field = (bad: boolean) =>
    `mt-1.5 min-h-12 w-full rounded-xl border-2 px-3 text-nil-900 placeholder:text-nil-300 ${
      bad ? "border-anhaar-600" : "border-nil-300"
    }`;

  // ============================ АЛХАМ 1 ============================
  if (step === 1) {
    return (
      <div className="pb-28">
        <StepBar step={1} />

        {settings.announcement && (
          <p className="mb-4 rounded-xl border-2 border-nil-300 bg-white p-3 text-sm text-nil-800">
            {settings.announcement}
          </p>
        )}

        <section className="rounded-2xl border-2 border-nil-300 bg-white p-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-nil-800">
                Сурагчийн овог нэр
              </label>
              <input
                id="name"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Жишээ: Батын Болд"
                autoComplete="name"
                className={field(nameInvalid)}
              />
              {nameInvalid && (
                <p className="mt-1 text-sm text-anhaar-600">Нэрээ бүтнээр нь бичнэ үү.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="grade" className="block text-sm font-bold text-nil-800">
                  Анги
                </label>
                <select
                  id="grade"
                  value={grade}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-nil-300 bg-white px-3 text-nil-900"
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
                <label htmlFor="group" className="block text-sm font-bold text-nil-800">
                  Бүлэг
                </label>
                <select
                  id="group"
                  value={classGroup}
                  onChange={(e) => setClassGroup(e.target.value)}
                  disabled={grade === ""}
                  className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-nil-300 bg-white px-3 text-nil-900 disabled:opacity-50"
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

            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-nil-800">
                Эцэг эх / асран хамгаалагчийн утас
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={12}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="8 оронтой дугаар"
                autoComplete="tel"
                className={field(phoneInvalid)}
              />
              {phoneInvalid && (
                <p className="mt-1 text-sm text-anhaar-600">
                  Утасны дугаар яг 8 оронтой байх ёстой.
                </p>
              )}
            </div>
          </div>
        </section>

        <p className="mt-5 text-center text-sm text-nil-600">
          Бүртгэлээ засах, цуцлах бол{" "}
          <Link href="/burtgel" className="font-bold text-nil-800 underline">
            Миний бүртгэл
          </Link>
        </p>

        <div className="fixed inset-x-0 bottom-0 border-t-2 border-nil-300 bg-white/95 backdrop-blur">
          <div
            className="mx-auto max-w-3xl px-4 py-3"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
          >
            {formError && (
              <p role="alert" className="mb-2 text-sm font-bold text-anhaar-600">
                {formError}
              </p>
            )}
            <button
              type="button"
              onClick={goToStep2}
              className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-nil-800 px-4 py-3 text-base font-bold text-white"
            >
              Үргэлжлүүлэх
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================ АЛХАМ 2 ============================
  return (
    <form onSubmit={handleSubmit} className="pb-36">
      <StepBar step={2} />

      {/* Сурагчийн мэдээлэл — наалдсан хураангуй */}
      <button
        type="button"
        onClick={backToStep1}
        className="sticky top-0 z-10 flex w-full items-center gap-2 rounded-xl border-2 border-nil-300 bg-white px-3 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-sm text-nil-800">
          <span className="font-bold text-nil-900">{cleanName(studentName)}</span>
          {" · "}
          {classGroup}
          {" · "}
          {normalizePhone(phone)}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-nil-600">
          <EditIcon className="h-3.5 w-3.5" /> Засах
        </span>
      </button>

      {/* Хайх */}
      <div className="relative mt-3">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-nil-600" />
        <input
          id="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Дугуйлан, багш, өрөөгөөр хайх"
          aria-label="Дугуйлан хайх"
          className="min-h-12 w-full rounded-xl border-2 border-nil-300 bg-white pr-10 pl-10 text-nil-900 placeholder:text-nil-300"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Хайлтыг цэвэрлэх"
            className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-nil-600"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      <p className="mt-2 text-sm text-nil-600">
        {query
          ? `${gradeClubs.length} дугуйлангаас ${visibleClubs.length} олдлоо`
          : `${grade}-р ангид ${gradeClubs.length} дугуйлан · хамгийн ихдээ ${maxClubs} сонгоно`}
      </p>

      {selected.length >= maxClubs && (
        <p className="mt-2 rounded-lg bg-nil-100 px-3 py-2 text-sm text-nil-800">
          {maxClubs} дугуйлан сонгосон тул бусад нь бүдгэрсэн байна. Өөрийг нь
          сонгохын тулд доорх сонголтоос аль нэгийг хасна уу.
        </p>
      )}

      {conflicts.length > 0 && (
        <div className="mt-3">
          <ConflictAlert conflicts={conflicts} />
        </div>
      )}

      {visibleClubs.length === 0 ? (
        <p className="mt-3 rounded-xl border-2 border-dashed border-nil-300 bg-white p-6 text-center text-sm text-nil-600">
          {query ? `«${query}» гэсэн дугуйлан олдсонгүй.` : "Дугуйлан олдсонгүй."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {visibleClubs.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              selected={selected.includes(club.id)}
              blockedByLimit={selected.length >= maxClubs && !selected.includes(club.id)}
              hasConflict={conflictIds.has(club.id)}
              onToggle={toggleClub}
            />
          ))}
        </ul>
      )}

      {/* ===== Доод талын тогтмол мөр ===== */}
      <div className="fixed inset-x-0 bottom-0 border-t-2 border-nil-300 bg-white/95 backdrop-blur">
        <div
          className="mx-auto max-w-3xl px-4 py-2.5"
          style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {formError && (
            <p role="alert" className="mb-2 text-sm font-bold text-anhaar-600">
              {formError}
            </p>
          )}

          {/* Сонгосон дугуйлангууд */}
          {selectedClubs.length > 0 ? (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {selectedClubs.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggleClub(c.id)}
                    className={`flex min-h-9 items-center gap-1.5 rounded-lg border-2 px-2.5 text-sm font-bold ${
                      conflictIds.has(c.id)
                        ? "border-anhaar-600 bg-anhaar-100 text-anhaar-700"
                        : "border-nil-300 bg-nil-100 text-nil-800"
                    }`}
                  >
                    {c.name}
                    <CloseIcon className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-2 text-sm text-nil-600">
              Дугуйлан сонгоогүй байна
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={backToStep1}
              aria-label="Буцах"
              className="flex min-h-13 w-13 shrink-0 items-center justify-center rounded-xl border-2 border-nil-600 text-nil-800"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="submit"
              disabled={submitting || selected.length === 0}
              className="min-h-13 flex-1 rounded-xl bg-nil-800 px-4 py-3 text-base font-bold text-white disabled:opacity-45"
            >
              {submitting
                ? "Илгээж байна..."
                : `Бүртгүүлэх${selected.length ? ` (${selected.length})` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
