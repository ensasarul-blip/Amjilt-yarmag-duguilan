"use client";

import SeatBar from "./SeatBar";
import { CheckIcon, ClockIcon, PersonIcon, PinIcon } from "./icons";
import { formatGrades, formatSession, sortSessions } from "@/lib/format";
import type { ClubView } from "@/lib/types";

type Props = {
  club: ClubView;
  selected: boolean;
  /** Хязгаарт хүрсэн тул энэ картыг нэмж сонгох боломжгүй */
  blockedByLimit: boolean;
  /** Энэ дугуйлан цагийн давхцалд орсон эсэх */
  hasConflict: boolean;
  onToggle: (clubId: string) => void;
};

/** Картын доторх нийтлэг агуулга */
function CardBody({ club, selected }: { club: ClubView; selected: boolean }) {
  const limited = club.capacity != null;
  const isFull = limited && club.registered >= club.capacity!;
  const sessions = sortSessions(club.sessions);

  return (
    <>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="text-base leading-tight font-bold text-nil-900">
              {club.name}
            </h3>
            <span className="text-xs text-nil-600">
              {formatGrades(club.grades)}-р анги
            </span>
          </div>

          <p className="mt-1 flex items-center gap-1.5 text-sm text-nil-800">
            <ClockIcon className="text-nil-600" />
            <span className="min-w-0">{sessions.map(formatSession).join(" · ")}</span>
          </p>

          {(club.room || club.teacher) && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-nil-600">
              {club.room && (
                <span className="flex items-center gap-1.5">
                  <PinIcon /> {club.room}
                </span>
              )}
              {club.teacher && (
                <span className="flex items-center gap-1.5">
                  <PersonIcon /> {club.teacher}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Баруун талын төлөв */}
        {isFull ? (
          <span className="shrink-0 rounded-md bg-anhaar-600 px-2 py-0.5 text-[11px] font-bold text-white">
            ДҮҮРСЭН
          </span>
        ) : !club.is_open ? (
          <span className="shrink-0 rounded-md bg-nil-600 px-2 py-0.5 text-[11px] font-bold text-white">
            ХААЛТТАЙ
          </span>
        ) : (
          <span
            aria-hidden="true"
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
              selected
                ? "border-nil-800 bg-nil-800 text-white"
                : "border-nil-300 bg-white"
            }`}
          >
            {selected && <CheckIcon className="h-4 w-4" />}
          </span>
        )}
      </div>

      {limited && (
        <SeatBar
          capacity={club.capacity!}
          registered={club.registered}
          waitlisted={club.waitlisted}
        />
      )}
    </>
  );
}

export default function ClubCard({
  club,
  selected,
  blockedByLimit,
  hasConflict,
  onToggle,
}: Props) {
  const limited = club.capacity != null;
  const isFull = limited && club.registered >= club.capacity!;
  const closed = !club.is_open;
  const cannotSelect = blockedByLimit && !selected;

  const border = hasConflict
    ? "border-anhaar-600 bg-anhaar-100"
    : selected
      ? "border-nil-800 bg-nil-100"
      : "border-nil-300 bg-white";

  // --- Дүүрсэн: карт өөрөө сонгогдохгүй, зөвхөн хүлээлгийн товчоор ---
  if (isFull && !closed) {
    return (
      <li className={`rounded-xl border-2 ${border}`}>
        <div className={`p-3 ${selected ? "" : "opacity-80"}`}>
          <CardBody club={club} selected={selected} />
        </div>
        <button
          type="button"
          onClick={() => onToggle(club.id)}
          disabled={cannotSelect}
          aria-pressed={selected}
          className={`min-h-11 w-full rounded-b-[10px] border-t-2 px-3 text-sm font-bold ${
            selected
              ? "border-nil-800 bg-nil-800 text-white"
              : "border-nil-300 bg-white text-anhaar-700 disabled:opacity-40"
          }`}
        >
          {selected ? "✓ Хүлээлгийн жагсаалтад сонгосон" : "Хүлээлгийн жагсаалтад орох"}
        </button>
      </li>
    );
  }

  // --- Хаалттай: огт сонгогдохгүй ---
  if (closed) {
    return (
      <li className={`rounded-xl border-2 ${border} opacity-60`}>
        <div className="p-3">
          <CardBody club={club} selected={false} />
        </div>
      </li>
    );
  }

  // --- Энгийн: БҮХ карт дарагдана (гар утсанд том товч) ---
  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(club.id)}
        disabled={cannotSelect}
        aria-pressed={selected}
        className={`w-full rounded-xl border-2 p-3 text-left transition-colors ${border} ${
          cannotSelect ? "cursor-not-allowed opacity-60" : ""
        }`}
      >
        <CardBody club={club} selected={selected} />
      </button>
    </li>
  );
}
