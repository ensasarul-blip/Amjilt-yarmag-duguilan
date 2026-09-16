import Image from "next/image";
import Link from "next/link";
import { SCHOOL_NAME } from "@/lib/constants";

/**
 * Толгой хэсэг: лого + сургуулийн нэр.
 * Логог солихдоо public/logo.webp файлыг сольно.
 */
export default function Header({ subtitle }: { subtitle?: string }) {
  return (
    <header className="bg-gradient-to-b from-nil-900 to-nil-800 text-white">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:gap-4 sm:py-4">
        <Link href="/" aria-label="Нүүр хуудас" className="shrink-0">
          <Image
            src="/logo.webp"
            alt=""
            width={48}
            height={48}
            priority
            /* Бараан дэвсгэр дээр ирмэг нь нийлэхээс сэргийлж нимгэн хүрээ */
            className="h-11 w-11 rounded-full ring-2 ring-nil-300/50 sm:h-13 sm:w-13"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <h1 className="text-sm leading-tight font-bold tracking-wide sm:text-lg">
            {SCHOOL_NAME}
          </h1>
          <p className="mt-0.5 text-xs text-nil-300 sm:text-sm">
            {subtitle ?? "Хичээлээс гадуурх сургалт, дугуйлангийн бүртгэл"}
          </p>
        </div>

        {/* Журмыг аль ч хуудаснаас дахин уншиж болно */}
        <Link
          href="/juram"
          className="shrink-0 rounded-lg border border-nil-300/60 px-2.5 py-1.5 text-xs font-bold text-nil-300 sm:text-sm"
        >
          Журам
        </Link>
      </div>
    </header>
  );
}
