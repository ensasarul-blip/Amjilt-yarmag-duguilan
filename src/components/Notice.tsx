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

/** Өгөгдлийн сантай холбогдож чадаагүй үед эцэг эхэд харагдах мэдэгдэл */
export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border-2 border-anhaar-600 bg-white p-5">
      <h2 className="text-lg font-bold text-anhaar-700">
        Түр зуур холбогдож чадсангүй
      </h2>
      <p className="mt-2 text-sm text-nil-800">
        Интернэт холболтоо шалгаад хэсэг хүлээгээд дахин оролдоно уу. Хэвээр
        давтагдвал сургуулийн админд хандаарай.
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex min-h-13 items-center rounded-xl bg-nil-800 px-5 py-3 text-base font-bold text-white"
      >
        Дахин оролдох
      </Link>
      {/* Техникийн дэлгэрэнгүйг зөвхөн шаардлагатай үед харна */}
      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-nil-600">
          Техникийн дэлгэрэнгүй
        </summary>
        <p className="mt-2 rounded-lg bg-nil-100 p-2 text-xs break-words text-nil-800">
          {message}
        </p>
      </details>
    </div>
  );
}
