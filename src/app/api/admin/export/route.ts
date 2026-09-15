import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { levelName } from "@/lib/constants";
import { formatDateTime, formatGrades, formatSession, sortSessions } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Club, ClubSession, SeatCount } from "@/lib/types";

export const dynamic = "force-dynamic";

type RegRow = {
  id: string;
  club_id: string;
  student_name: string;
  grade: number;
  class_group: string;
  parent_phone: string;
  status: "registered" | "waitlisted" | "cancelled";
  created_at: string;
  cancelled_at: string | null;
};

const STATUS_MN: Record<string, string> = {
  registered: "Бүртгэгдсэн",
  waitlisted: "Хүлээлгийн жагсаалт",
  cancelled: "Цуцлагдсан",
};

/** Excel-ийн sheet нэрэнд ашиглаж болохгүй тэмдэгтүүдийг цэвэрлэнэ (дээд тал нь 31 тэмдэгт) */
function safeSheetName(base: string, used: Set<string>): string {
  let name = base.replace(/[\[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Дугуйлан";

  if (used.has(name)) {
    let i = 2;
    let candidate = `${name.slice(0, 28)} ${i}`;
    while (used.has(candidate)) {
      i += 1;
      candidate = `${name.slice(0, 28)} ${i}`;
    }
    name = candidate;
  }

  used.add(name);
  return name;
}

export async function GET() {
  const supabase = await createClient();

  // --- Зөвхөн нэвтэрсэн админ ---
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Нэвтрээгүй байна." }, { status: 401 });
  }

  const [clubsRes, sessionsRes, seatsRes, regsRes] = await Promise.all([
    supabase.from("clubs").select("*").order("sort_order", { ascending: true }),
    supabase.from("club_sessions").select("*"),
    supabase.from("club_seat_counts").select("*"),
    supabase
      .from("registrations")
      .select(
        "id, club_id, student_name, grade, class_group, parent_phone, status, created_at, cancelled_at",
      )
      .order("created_at", { ascending: true }),
  ]);

  const firstError =
    clubsRes.error ?? sessionsRes.error ?? seatsRes.error ?? regsRes.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const clubs = (clubsRes.data ?? []) as Club[];
  const sessions = (sessionsRes.data ?? []) as ClubSession[];
  const seats = (seatsRes.data ?? []) as SeatCount[];
  const regs = (regsRes.data ?? []) as RegRow[];

  const sessionsByClub = new Map<string, ClubSession[]>();
  for (const s of sessions) {
    const list = sessionsByClub.get(s.club_id) ?? [];
    list.push(s);
    sessionsByClub.set(s.club_id, list);
  }

  const seatByClub = new Map(seats.map((s) => [s.club_id, s]));

  const regsByClub = new Map<string, RegRow[]>();
  for (const r of regs) {
    const list = regsByClub.get(r.club_id) ?? [];
    list.push(r);
    regsByClub.set(r.club_id, list);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Амжилт Кибер Яармаг сургууль";
  workbook.created = new Date();

  // =====================================================================
  //  1-р sheet: Нэгдсэн хураангуй
  // =====================================================================
  const summary = workbook.addWorksheet("Хураангуй");
  summary.columns = [
    { header: "Дугуйлан", key: "name", width: 30 },
    { header: "Түвшин", key: "level", width: 12 },
    { header: "Хамрах анги", key: "grades", width: 14 },
    { header: "Гараг, цаг", key: "time", width: 38 },
    { header: "Өрөө", key: "room", width: 12 },
    { header: "Багш", key: "teacher", width: 22 },
    { header: "Хязгаар", key: "capacity", width: 10 },
    { header: "Бүртгэгдсэн", key: "registered", width: 13 },
    { header: "Хүлээлэг", key: "waitlisted", width: 11 },
    { header: "Төлөв", key: "state", width: 14 },
  ];

  for (const club of clubs) {
    const seat = seatByClub.get(club.id);
    const registered = seat?.registered_count ?? 0;
    const waitlisted = seat?.waitlist_count ?? 0;
    const isFull = club.capacity != null && registered >= club.capacity;

    summary.addRow({
      name: club.name,
      level: levelName(club.level),
      grades: formatGrades(club.grades),
      time: sortSessions(sessionsByClub.get(club.id) ?? [])
        .map(formatSession)
        .join(" | "),
      room: club.room ?? "",
      teacher: club.teacher ?? "",
      capacity: club.capacity ?? "Хязгааргүй",
      registered,
      waitlisted,
      state: !club.is_open ? "Хаалттай" : isFull ? "ДҮҮРСЭН" : "Нээлттэй",
    });
  }

  summary.getRow(1).font = { bold: true };
  summary.views = [{ state: "frozen", ySplit: 1 }];
  summary.autoFilter = { from: "A1", to: "J1" };

  // =====================================================================
  //  Дугуйлан бүрд ТУСДАА sheet
  // =====================================================================
  const usedNames = new Set<string>(["Хураангуй"]);

  for (const club of clubs) {
    const sheetBase = `${club.name} (${formatGrades(club.grades)})`;
    const sheet = workbook.addWorksheet(safeSheetName(sheetBase, usedNames));

    sheet.columns = [
      { header: "№", key: "no", width: 6 },
      { header: "Төлөв", key: "status", width: 20 },
      { header: "Овог нэр", key: "name", width: 28 },
      { header: "Анги", key: "grade", width: 8 },
      { header: "Бүлэг", key: "group", width: 10 },
      { header: "Эцэг эхийн утас", key: "phone", width: 18 },
      { header: "Бүртгүүлсэн", key: "created", width: 20 },
    ];

    const rows = regsByClub.get(club.id) ?? [];
    const order = { registered: 0, waitlisted: 1, cancelled: 2 } as const;
    const sorted = [...rows].sort(
      (a, b) =>
        order[a.status] - order[b.status] ||
        a.created_at.localeCompare(b.created_at),
    );

    const counters: Record<string, number> = {
      registered: 0,
      waitlisted: 0,
      cancelled: 0,
    };

    for (const r of sorted) {
      counters[r.status] += 1;
      sheet.addRow({
        no: counters[r.status],
        status: STATUS_MN[r.status] ?? r.status,
        name: r.student_name,
        grade: r.grade,
        group: r.class_group,
        // Excel 0-оор эхэлсэн дугаарыг таслахаас сэргийлж текстээр
        phone: `${r.parent_phone}`,
        created: formatDateTime(r.created_at),
      });
    }

    sheet.getColumn("phone").numFmt = "@";
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    if (sorted.length === 0) {
      sheet.addRow({ no: "", status: "Бүртгэл алга" });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="amjilt-burtgel-${today}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
