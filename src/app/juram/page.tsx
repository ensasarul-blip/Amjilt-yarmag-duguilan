import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import JuramText from "@/components/JuramText";
import { ArrowLeftIcon } from "@/components/icons";
import { JURAM_TITLE } from "@/lib/juram";

export const metadata: Metadata = {
  title: `${JURAM_TITLE} | АМЖИЛТ КИБЕР ЯАРМАГ СУРГУУЛЬ`,
  description:
    "Амжилт Кибер Яармаг сургуулийн дугуйланд хичээллэх журам: бүртгэл, ирц, таслалт, эцэг эхийн үүрэг.",
};

export default function JuramPage() {
  return (
    <>
      <Header subtitle="Дугуйлангийн журам" />
      <main className="mx-auto max-w-3xl px-4 py-5">
        <JuramText compact />

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-nil-800 px-4 text-base font-bold text-white"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Бүртгэл рүү буцах
          </Link>
          <Link
            href="/burtgel"
            className="flex min-h-14 flex-1 items-center justify-center rounded-xl border-2 border-nil-600 bg-white px-4 text-base font-bold text-nil-800"
          >
            Миний бүртгэл
          </Link>
        </div>
      </main>
    </>
  );
}
