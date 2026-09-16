import { JURAM, JURAM_HIGHLIGHTS, JURAM_TITLE } from "@/lib/juram";
import { CheckIcon } from "./icons";

/**
 * Журмын бүтэн эх бичвэр.
 * Бүртгэлийн эхний алхам болон /juram хуудас хоёул үүнийг ашиглана.
 */
export default function JuramText({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      {/* ---- Анхаарал татах гарчиг ---- */}
      <div className="rounded-2xl bg-gradient-to-br from-nil-900 to-nil-600 px-5 py-6 text-center text-white">
        <p className="text-xs font-bold tracking-[0.2em] text-nil-300">
          АМЖИЛТ КИБЕР ЯАРМАГ СУРГУУЛЬ
        </p>
        <h2 className="mt-2 text-xl leading-tight font-bold sm:text-2xl">{JURAM_TITLE}</h2>
        {!compact ? (
          <p className="mx-auto mt-3 max-w-md text-sm text-nil-300">
            Бүртгүүлэхийн өмнө журамтай бүрэн танилцана уу.
          </p>
        ) : null}
      </div>

      {/* ---- Хамгийн чухал 4 зүйл ---- */}
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {JURAM_HIGHLIGHTS.map((h) => (
          <div
            key={h.title}
            className="flex gap-3 rounded-xl border-2 border-nil-300 bg-white p-3.5"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-nil-800">
              <CheckIcon className="h-3.5 w-3.5 text-white" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-nil-900">{h.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-nil-600">{h.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ---- Бүтэн журам ---- */}
      <div className="mt-5 space-y-4">
        {JURAM.map((sec) => (
          <section key={sec.n} className="rounded-2xl border-2 border-nil-300 bg-white p-4">
            <h3 className="flex items-baseline gap-2 border-b-2 border-nil-100 pb-2.5 text-base font-bold text-nil-900">
              <span className="text-nil-600">{sec.n}.</span>
              {sec.title}
            </h3>
            <ul className="mt-3 space-y-2.5">
              {sec.items.map((it) => (
                <li key={it.n} className="flex gap-2.5">
                  <span className="shrink-0 text-sm font-bold text-nil-600 tabular-nums">
                    {it.n}
                  </span>
                  <span className="text-sm leading-relaxed text-nil-800">{it.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
