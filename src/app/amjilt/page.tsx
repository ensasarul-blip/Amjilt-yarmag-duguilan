"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ConfirmationPanel from "@/components/ConfirmationPanel";
import type { ConfirmationPayload } from "@/lib/types";

const CONFIRM_KEY = "amjilt:confirmation";

export default function ConfirmationPage() {
  const [payload, setPayload] = useState<ConfirmationPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CONFIRM_KEY);
      if (raw) setPayload(JSON.parse(raw) as ConfirmationPayload);
    } catch {
      // Хөтөч хадгалахыг хориглосон — доорх мессеж харагдана
    }
    setLoaded(true);
  }, []);

  return (
    <>
      <Header subtitle="Бүртгэлийн баталгаажуулалт" />
      <main className="mx-auto max-w-3xl px-4 py-5">
        {!loaded ? null : payload ? (
          <ConfirmationPanel payload={payload} />
        ) : (
          <div className="rounded-2xl border-2 border-nil-300 bg-white p-6 text-center">
            <p className="text-base font-bold text-nil-900">
              Баталгаажуулах мэдээлэл олдсонгүй
            </p>
            <p className="mt-2 text-sm text-nil-600">
              Бүртгэлээ шалгахыг хүсвэл &laquo;Миний бүртгэл&raquo; хуудсаар
              орж, анги, бүлэг, нэрээрээ хайна уу.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/burtgel"
                className="min-h-13 flex-1 rounded-xl border-2 border-nil-600 bg-white px-4 py-3 text-base font-bold text-nil-800"
              >
                Миний бүртгэл
              </Link>
              <Link
                href="/"
                className="min-h-13 flex-1 rounded-xl bg-nil-800 px-4 py-3 text-base font-bold text-white"
              >
                Нүүр хуудас
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
