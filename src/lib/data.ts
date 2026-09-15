import { createClient } from "./supabase/server";
import type {
  AppSettings,
  ClassGroup,
  Club,
  ClubSession,
  ClubView,
  SeatCount,
} from "./types";

export type PublicData =
  | { ok: true; settings: AppSettings; groups: ClassGroup[]; clubs: ClubView[] }
  | { ok: false; error: string };

/**
 * Нийтийн хуудсанд хэрэгтэй бүх өгөгдлийг нэг дор уншина.
 * (дугуйлан + цаг + суудлын тоо + бүлэг + тохиргоо)
 */
export async function loadPublicData(): Promise<PublicData> {
  try {
    const supabase = await createClient();

    const [settingsRes, groupsRes, clubsRes, sessionsRes, seatsRes] =
      await Promise.all([
        supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
        supabase
          .from("class_groups")
          .select("*")
          .order("grade", { ascending: true })
          .order("sort_order", { ascending: true }),
        supabase.from("clubs").select("*").order("sort_order", { ascending: true }),
        supabase.from("club_sessions").select("*"),
        supabase.from("club_seat_counts").select("*"),
      ]);

    const firstError =
      settingsRes.error ??
      groupsRes.error ??
      clubsRes.error ??
      sessionsRes.error ??
      seatsRes.error;

    if (firstError) {
      return { ok: false, error: firstError.message };
    }

    const sessions = (sessionsRes.data ?? []) as ClubSession[];
    const seats = (seatsRes.data ?? []) as SeatCount[];

    const sessionsByClub = new Map<string, ClubSession[]>();
    for (const s of sessions) {
      const list = sessionsByClub.get(s.club_id) ?? [];
      list.push(s);
      sessionsByClub.set(s.club_id, list);
    }

    const seatsByClub = new Map(seats.map((s) => [s.club_id, s]));

    const clubs: ClubView[] = ((clubsRes.data ?? []) as Club[]).map((c) => ({
      ...c,
      sessions: sessionsByClub.get(c.id) ?? [],
      registered: seatsByClub.get(c.id)?.registered_count ?? 0,
      waitlisted: seatsByClub.get(c.id)?.waitlist_count ?? 0,
    }));

    const settings = (settingsRes.data as AppSettings | null) ?? {
      id: 1,
      registration_open: true,
      max_clubs_per_student: 2,
      announcement: null,
    };

    return {
      ok: true,
      settings,
      groups: (groupsRes.data ?? []) as ClassGroup[],
      clubs,
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
