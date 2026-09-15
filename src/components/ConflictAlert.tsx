import { WarningIcon } from "./icons";
import type { Conflict } from "@/lib/overlap";

/**
 * Цагийн давхцлын анхааруулга.
 * ⚠️ Анхааруулга гарсан ч илгээхийг ХОРИГЛОХГҮЙ — эцэг эх өөрөө шийднэ.
 */
export default function ConflictAlert({ conflicts }: { conflicts: Conflict[] }) {
  if (conflicts.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-anhaar-600 bg-anhaar-100 p-3"
    >
      <p className="flex items-center gap-2 text-base font-bold text-anhaar-700">
        <WarningIcon className="h-5 w-5" />
        Цагийн давхцал илэрлээ
      </p>
      <ul className="mt-1.5 space-y-1">
        {conflicts.map((c, i) => (
          <li key={i} className="text-sm leading-snug text-anhaar-700">
            • {c.message}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-anhaar-700">
        Ингэж бүртгүүлэх боломжтой хэвээр. Гэхдээ сурагч хоёр дугуйланд зэрэг сууж
        чадахгүйг анхаарна уу.
      </p>
    </div>
  );
}
