import Link from "next/link";
import Header from "@/components/Header";

/** Байхгүй хаяг руу орвол харагдах хуудас (өмнө нь англиар гардаг байсан). */
export default function NotFound() {
  return (
    <>
      <Header subtitle="Хуудас олдсонгүй" />
      <main className="mx-auto max-w-3xl px-4 py-5">
        <div className="rounded-2xl border-2 border-nil-300 bg-white p-6 text-center">
          <p className="text-5xl font-bold text-nil-300">404</p>
          <h2 className="mt-3 text-lg font-bold text-nil-900">
            Энэ хуудас олдсонгүй
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-nil-600">
            Хаяг буруу бичигдсэн эсвэл хуудас шилжсэн байж магадгүй. Доорх
            товчоор үргэлжлүүлнэ үү.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
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
              Дугуйлангийн бүртгэл
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
