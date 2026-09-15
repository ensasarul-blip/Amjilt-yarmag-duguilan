"use client";

import { useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";

/**
 * Гэнэтийн алдаа гарвал харагдах хуудас.
 * Next.js 16-д дахин оролдох функц нь `retry` (өмнө нь `reset` байсан).
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <Header subtitle="Алдаа гарлаа" />
      <main className="mx-auto max-w-3xl px-4 py-5">
        <div className="rounded-2xl border-2 border-anhaar-600 bg-white p-6 text-center">
          <h2 className="text-lg font-bold text-anhaar-700">
            Уучлаарай, түр зуурын алдаа гарлаа
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-nil-800">
            Интернэт холболтоо шалгаад <strong>&laquo;Дахин оролдох&raquo;</strong>{" "}
            товчийг дарна уу. Хэвээр давтагдвал сургуулийн админд хандаарай.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => retry()}
              className="min-h-13 flex-1 rounded-xl bg-nil-800 px-4 py-3 text-base font-bold text-white"
            >
              Дахин оролдох
            </button>
            <Link
              href="/"
              className="min-h-13 flex-1 rounded-xl border-2 border-nil-600 bg-white px-4 py-3 text-base font-bold text-nil-800"
            >
              Нүүр хуудас
            </Link>
          </div>

          {error.digest ? (
            <p className="mt-4 text-xs text-nil-600">
              Алдааны дугаар: <code>{error.digest}</code>
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}
