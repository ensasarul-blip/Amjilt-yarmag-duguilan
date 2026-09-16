"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: boolean; message: string } | null;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  return supabase;
}

type SessionInput = {
  weekday: number | null;
  start_time: string | null;
  end_time: string | null;
};

function parseSessions(raw: string | null): SessionInput[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SessionInput[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s) => ({
      weekday: s.weekday == null || Number.isNaN(Number(s.weekday)) ? null : Number(s.weekday),
      start_time: s.start_time || null,
      end_time: s.end_time || null,
    }));
  } catch {
    return [];
  }
}

function parseClubForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const level = String(formData.get("level") ?? "baga");
  const grades = formData
    .getAll("grades")
    .map((g) => Number(g))
    .filter((g) => Number.isInteger(g) && g >= 1 && g <= 12);
  const room = String(formData.get("room") ?? "").trim() || null;
  const teacher = String(formData.get("teacher") ?? "").trim() || null;
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const capacity = capacityRaw === "" ? null : Number(capacityRaw);
  const is_open = formData.get("is_open") === "on";
  const sessions = parseSessions(formData.get("sessions") as string | null);

  return { name, level, grades, room, teacher, capacity, is_open, sessions };
}

function validateClub(c: ReturnType<typeof parseClubForm>): string | null {
  if (c.name.length === 0) return "Дугуйлангийн нэрийг бичнэ үү.";
  if (c.grades.length === 0) return "Дор хаяж нэг анги сонгоно уу.";
  if (c.capacity != null && (!Number.isInteger(c.capacity) || c.capacity < 1))
    return "Хязгаар нь 1-ээс их бүхэл тоо байх ёстой (хязгааргүй бол хоосон орхино).";
  for (const s of c.sessions) {
    if (s.weekday != null && s.start_time && s.end_time && s.end_time <= s.start_time)
      return "Хичээл дуусах цаг нь эхлэх цагаас хойш байх ёстой.";
  }
  return null;
}

async function replaceSessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clubId: string,
  sessions: SessionInput[],
) {
  await supabase.from("club_sessions").delete().eq("club_id", clubId);

  const rows =
    sessions.length === 0
      ? [{ club_id: clubId, weekday: null, start_time: null, end_time: null, note: "Цаг тодорхойгүй" }]
      : sessions.map((s) => ({
          club_id: clubId,
          weekday: s.weekday,
          start_time: s.weekday == null ? null : s.start_time,
          end_time: s.weekday == null ? null : s.end_time,
          note: s.weekday == null ? "Цаг тодорхойгүй" : null,
        }));

  const { error } = await supabase.from("club_sessions").insert(rows);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------
// Дугуйлан нэмэх
// ---------------------------------------------------------------------
export async function createClubAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await requireAdmin();
  const club = parseClubForm(formData);

  const problem = validateClub(club);
  if (problem) return { ok: false, message: problem };

  const { data, error } = await supabase
    .from("clubs")
    .insert({
      name: club.name,
      level: club.level,
      grades: club.grades,
      room: club.room,
      teacher: club.teacher,
      capacity: club.capacity,
      is_open: club.is_open,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: `Алдаа: ${error.message}` };

  try {
    await replaceSessions(supabase, data.id, club.sessions);
  } catch (err) {
    return { ok: false, message: `Цаг хадгалахад алдаа: ${(err as Error).message}` };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect(`/admin/clubs/${data.id}`);
}

// ---------------------------------------------------------------------
// Дугуйлан засах
// ---------------------------------------------------------------------
export async function updateClubAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await requireAdmin();
  const clubId = String(formData.get("club_id") ?? "");
  const club = parseClubForm(formData);

  const problem = validateClub(club);
  if (problem) return { ok: false, message: problem };

  const { error } = await supabase
    .from("clubs")
    .update({
      name: club.name,
      level: club.level,
      grades: club.grades,
      room: club.room,
      teacher: club.teacher,
      capacity: club.capacity,
      is_open: club.is_open,
    })
    .eq("id", clubId);

  if (error) return { ok: false, message: `Алдаа: ${error.message}` };

  try {
    await replaceSessions(supabase, clubId, club.sessions);
  } catch (err) {
    return { ok: false, message: `Цаг хадгалахад алдаа: ${(err as Error).message}` };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/clubs/${clubId}`);
  revalidatePath("/");
  return { ok: true, message: "Хадгаллаа." };
}

// ---------------------------------------------------------------------
// Дугуйлан устгах
// ---------------------------------------------------------------------
export async function deleteClubAction(formData: FormData) {
  const supabase = await requireAdmin();
  const clubId = String(formData.get("club_id") ?? "");

  const { error } = await supabase.from("clubs").delete().eq("id", clubId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
}

// ---------------------------------------------------------------------
// Бүртгэл нээх / хаах (нэг дугуйлан)
// ---------------------------------------------------------------------
export async function toggleClubOpenAction(formData: FormData) {
  const supabase = await requireAdmin();
  const clubId = String(formData.get("club_id") ?? "");
  const nextOpen = formData.get("next_open") === "true";

  const { error } = await supabase
    .from("clubs")
    .update({ is_open: nextOpen })
    .eq("id", clubId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath(`/admin/clubs/${clubId}`);
  revalidatePath("/");
}

// ---------------------------------------------------------------------
// Бүртгэл цуцлах (хүлээлгийн эхний хүн автоматаар орно)
// ---------------------------------------------------------------------
export async function cancelRegistrationAction(formData: FormData) {
  const supabase = await requireAdmin();
  const registrationId = String(formData.get("registration_id") ?? "");
  const clubId = String(formData.get("club_id") ?? "");

  const { error } = await supabase.rpc("cancel_registration", {
    p_registration_id: registrationId,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/clubs/${clubId}`);
  revalidatePath("/admin");
  revalidatePath("/");
}

// ---------------------------------------------------------------------
// Хүлээлгээс гараар бүртгэлд оруулах
// ---------------------------------------------------------------------
export async function promoteRegistrationAction(formData: FormData) {
  const supabase = await requireAdmin();
  const registrationId = String(formData.get("registration_id") ?? "");
  const clubId = String(formData.get("club_id") ?? "");

  const { error } = await supabase.rpc("promote_registration", {
    p_registration_id: registrationId,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/clubs/${clubId}`);
  revalidatePath("/admin");
  revalidatePath("/");
}

// ---------------------------------------------------------------------
// Ерөнхий тохиргоо
// ---------------------------------------------------------------------
/**
 * ШАТЛАСАН БҮРТГЭЛ: түвшин бүрийн өдрийг хадгална.
 *
 * Админ зөвхөн ӨДРИЙГ сонгоно. Тухайн өдрийн 00:00-ээс маргаашийн 00:00
 * хүртэл (Улаанбаатарын цагаар) нээлттэй байна. Хоосон орхивол
 * тэр түвшинд хязгаар байхгүй болно.
 */
export async function updateScheduleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await requireAdmin();

  const LEVEL_CODES = ["baga", "dund", "ahlah"] as const;

  for (const level of LEVEL_CODES) {
    const raw = String(formData.get(`date_${level}`) ?? "").trim();

    let opens_at: string | null = null;
    let closes_at: string | null = null;

    if (raw) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
      if (!m) return { ok: false, message: "Огноо буруу байна." };
      const [, y, mo, d] = m;
      // Улаанбаатар = UTC+8 (зуны цаг байхгүй), тиймээс 00:00+08 = 16:00 UTC өмнөх өдөр
      const opens = new Date(
        Date.UTC(Number(y), Number(mo) - 1, Number(d)) - 8 * 3600 * 1000,
      );
      opens_at = opens.toISOString();
      closes_at = new Date(opens.getTime() + 24 * 3600 * 1000).toISOString();
    }

    const { error } = await supabase
      .from("level_schedule")
      .update({ opens_at, closes_at })
      .eq("level", level);

    if (error) return { ok: false, message: `Алдаа: ${error.message}` };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, message: "Хуваарь хадгалагдлаа." };
}

export async function updateSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await requireAdmin();

  const registration_open = formData.get("registration_open") === "on";
  const max = Number(formData.get("max_clubs_per_student") ?? 2);
  const announcement = String(formData.get("announcement") ?? "").trim() || null;

  if (!Number.isInteger(max) || max < 1 || max > 10) {
    return { ok: false, message: "Дугуйлангийн дээд хязгаар 1–10 хооронд байна." };
  }

  const { error } = await supabase
    .from("app_settings")
    .update({
      registration_open,
      max_clubs_per_student: max,
      announcement,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { ok: false, message: `Алдаа: ${error.message}` };

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, message: "Тохиргоо хадгалагдлаа." };
}

// ---------------------------------------------------------------------
// Гарах
// ---------------------------------------------------------------------
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
