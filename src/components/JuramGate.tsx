"use client";

import { useEffect, useState } from "react";
import JuramText from "./JuramText";
import { ArrowRightIcon, CheckIcon } from "./icons";

/**
 * Бүртгэлийн ЭХНИЙ алхам: журам.
 *
 * Эцэг эх журмыг эцэс хүртэл гүйлгэж уншсаны дараа л зөвшөөрөх нүд
 * идэвхжинэ. Ингэснээр "уншаагүй байж зөвшөөрөх" боломжгүй болно.
 */
export default function JuramGate({ onAccept }: { onAccept: () => void }) {
  const [readToEnd, setReadToEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    // Хуудасны ёроолд хүрсэн эсэхийг шууд тооцно. IntersectionObserver-оос
    // илүү найдвартай: доод талын наалдсан мөр хэмжигчийг халхлах эрсдэлгүй.
    const check = () => {
      const doc = document.documentElement;
      const distanceToEnd = doc.scrollHeight - (window.scrollY + window.innerHeight);
      if (distanceToEnd <= 160) setReadToEnd(true);
    };

    check(); // Том дэлгэцэд журам бүхэлдээ багтвал шууд идэвхжинэ
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  const scrollToEnd = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  };

  return (
    <>
      <JuramText />
      {/* Доод талын наалдсан мөр бичвэрийг халхлахгүйн тулд зай үлдээнэ */}
      <div className="h-44" aria-hidden="true" />

      <div className="fixed inset-x-0 bottom-0 border-t-2 border-nil-300 bg-white/95 backdrop-blur">
        <div
          className="mx-auto max-w-3xl px-4 py-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {!readToEnd ? (
            <button
              type="button"
              onClick={scrollToEnd}
              className="mb-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-nil-100 px-4 py-2.5 text-sm font-bold text-nil-800"
            >
              Журмыг эцэс хүртэл уншина уу
              <span aria-hidden="true">↓</span>
            </button>
          ) : (
            <label className="mb-2.5 flex cursor-pointer items-start gap-3 rounded-xl bg-nil-100 p-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                  agreed ? "border-nil-800 bg-nil-800" : "border-nil-600 bg-white"
                }`}
              >
                {agreed ? <CheckIcon className="h-4 w-4 text-white" /> : null}
              </span>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only"
              />
              <span className="text-sm leading-snug font-bold text-nil-900">
                Би журамтай бүрэн танилцаж, хүлээн зөвшөөрлөө
              </span>
            </label>
          )}

          <button
            type="button"
            disabled={!agreed}
            onClick={onAccept}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-nil-800 px-4 text-base font-bold text-white disabled:bg-nil-300 disabled:text-nil-600"
          >
            Зөвшөөрөөд бүртгүүлэх
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
}
