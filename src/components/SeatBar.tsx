import { LOW_SEAT_THRESHOLD } from "@/lib/constants";
import { WarningIcon } from "./icons";

type Props = {
  capacity: number;
  registered: number;
  waitlisted: number;
};

/**
 * Авсаархан суудлын заагч.
 *   "Үлдсэн суудал: 7 / 15" + прогресс бар
 *   3-аас цөөн үлдвэл -> улаанаар "Цөөн суудал үлдлээ"
 *   Дүүрвэл -> улаан бар + хүлээлгийн тоо
 */
export default function SeatBar({ capacity, registered, waitlisted }: Props) {
  const taken = Math.min(registered, capacity);
  const remaining = Math.max(capacity - registered, 0);
  const percent = capacity > 0 ? Math.round((taken / capacity) * 100) : 0;
  const isFull = remaining === 0;
  const isLow = !isFull && remaining < LOW_SEAT_THRESHOLD;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-nil-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={capacity}
          aria-valuenow={taken}
          aria-label={`${capacity} суудлаас ${taken} нь дүүрсэн`}
        >
          <div
            className={`seat-bar-fill h-full rounded-full ${isFull ? "bg-anhaar-600" : "bg-nil-600"}`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <span
          className={`shrink-0 text-xs font-bold tabular-nums ${
            isFull || isLow ? "text-anhaar-600" : "text-nil-800"
          }`}
        >
          {isFull
            ? waitlisted > 0
              ? `Дүүрсэн · хүлээлэг ${waitlisted}`
              : "Суудал дүүрсэн"
            : `Үлдсэн суудал: ${remaining} / ${capacity}`}
        </span>
      </div>

      {isLow && (
        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-anhaar-600">
          <WarningIcon className="h-3.5 w-3.5" />
          Цөөн суудал үлдлээ
        </p>
      )}
    </div>
  );
}
