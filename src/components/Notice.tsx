import Link from "next/link";

/** Тохиргоо дутуу үед харагдах заавар */
export function SetupNotice() {
  return (
    <div className="rounded-2xl border-2 border-nil-300 bg-white p-5">
      <h2 className="text-lg font-bold text-nil-900">Тохиргоо дутуу байна</h2>
      <p className="mt-2 text-sm text-nil-800">
        Supabase-ийн холболтын мэдээлэл олдсонгүй. Төслийн хавтас дотор{" "}
        <code className="rounded bg-nil-100 px-1">.env.local</code> файл үүсгээд
        дараах хоёр мөрийг бөглөнө үү:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-nil-900 p-3 text-xs text-nil-100">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...`}
      </pre>
      <p className="mt-3 text-sm text-nil-600">
        Дэлгэрэнгүй алхмыг төслийн <strong>README.md</strong> файлаас уншина уу.
      </p>
    </div>
  );
}

/** Өгөгдлийн сангийн алдаа */
export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border-2 border-anhaar-600 bg-anhaar-100 p-5">
      <h2 className="text-lg font-bold text-anhaar-700">
        Өгөгдлийн сантай холбогдож чадсангүй
      </h2>
      <p className="mt-2 text-sm text-anhaar-700">{message}</p>
      <p className="mt-3 text-sm text-anhaar-700">
        Supabase дээр <strong>supabase/</strong> хавтас доторх SQL файлуудыг
        ажиллуулсан эсэхээ шалгана уу (README.md-ийн 3-р алхам).
      </p>
      <Link href="/" className="mt-3 inline-block font-bold text-anhaar-700 underline">
        Дахин оролдох
      </Link>
    </div>
  );
}
