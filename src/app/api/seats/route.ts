import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";

/**
 * Дугуйлан бүрийн суудлын тоог буцаана.
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ: өмнө нь эцэг эх бүрийн хөтөч 20 секунд тутам
 * Supabase руу ШУУД ханддаг байсан. 800 хүн нээж байвал энэ нь секундэд
 * 40 хүсэлт — үнэгүй багцад хүндрэл үүсгэнэ.
 *
 * Одоо бүгд энэ хаяг руу ханддаг бөгөөд Vercel-ийн кеш 5 секунд барина.
 * Тиймээс 800 хүн байсан ч Supabase руу 5 секундэд НЭГ л хүсэлт очно.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("club_seat_counts")
      .select("club_id, registered_count, waitlist_count");

    if (error) {
      return NextResponse.json(
        { ok: false },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Хэмжээг багасгахын тулд богино түлхүүр ашиглана: r = бүртгэгдсэн, w = хүлээлэг
    const seats: Record<string, { r: number; w: number }> = {};
    for (const row of data ?? []) {
      seats[row.club_id] = {
        r: row.registered_count,
        w: row.waitlist_count,
      };
    }

    return NextResponse.json(
      { ok: true, seats },
      {
        headers: {
          // Vercel-ийн кеш 5 секунд барина, 25 секунд хүртэл хуучин хуулбараар
          // үйлчилж байхдаа шинийг нь авчирна (хэрэглэгч хүлээхгүй).
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=25",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
