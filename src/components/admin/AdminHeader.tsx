import Image from "next/image";
import Link from "next/link";
import { DownloadIcon } from "@/components/icons";
import { signOutAction } from "@/app/admin/actions";

/**
 * Авсаархан админ толгой.
 * Цэс нь нэг мөрөнд багтаж, хэрэгтэй бол хэвтээ гүйнэ (гар утсанд зай хэмнэнэ).
 */
export default function AdminHeader({ email }: { email?: string | null }) {
  const pill =
    "flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border-2 border-nil-600 px-3 text-sm font-bold text-white";

  return (
    <header className="bg-nil-900 text-white">
      <div className="mx-auto max-w-5xl px-4 pt-2.5 pb-2">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin" className="flex min-w-0 items-center gap-2">
            <Image
              src="/logo.webp"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-full ring-2 ring-nil-300/50"
            />
            <span className="min-w-0">
              <span className="block text-sm font-bold sm:text-base">Админ самбар</span>
              {email && (
                <span className="block truncate text-[11px] text-nil-300">{email}</span>
              )}
            </span>
          </Link>

          <form action={signOutAction}>
            <button
              type="submit"
              className="min-h-10 shrink-0 rounded-lg border-2 border-nil-600 px-3 text-sm font-bold text-white"
            >
              Гарах
            </button>
          </form>
        </div>

        <nav className="no-print -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
          <Link href="/admin" className={`${pill} border-nil-600 bg-nil-600`}>
            Самбар
          </Link>
          <Link href="/admin/clubs/new" className={pill}>
            + Дугуйлан
          </Link>
          <a href="/api/admin/export" className={pill}>
            <DownloadIcon className="h-4 w-4" /> Excel
          </a>
          <Link href="/" className={pill}>
            Нийтийн хуудас
          </Link>
        </nav>
      </div>
    </header>
  );
}
