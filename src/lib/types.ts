export type Level = "baga" | "dund" | "ahlah";

export type RegistrationStatus = "registered" | "waitlisted" | "cancelled";

export type ClubSession = {
  id: string;
  club_id: string;
  weekday: number | null;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
};

export type Club = {
  id: string;
  name: string;
  level: Level;
  grades: number[];
  room: string | null;
  teacher: string | null;
  capacity: number | null;
  is_open: boolean;
  sort_order: number;
  created_at: string;
};

export type SeatCount = {
  club_id: string;
  registered_count: number;
  waitlist_count: number;
  updated_at: string;
};

/** Карт харуулахад ашиглах бүрэн бүтэн загвар */
export type ClubView = Club & {
  sessions: ClubSession[];
  registered: number;
  waitlisted: number;
};

export type AppSettings = {
  id: number;
  registration_open: boolean;
  max_clubs_per_student: number;
  announcement: string | null;
};

/** Түвшин тус бүрийн бүртгэлийн хуваарь (шатласан бүртгэл) */
export type LevelSchedule = {
  level: Level;
  opens_at: string | null;
  closes_at: string | null;
  sort_order: number;
};

export type ClassGroup = {
  code: string;
  grade: number;
  sort_order: number;
};

/** register_student функцээс буцах утга */
export type RegisterResult = {
  club_id: string;
  club_name: string | null;
  status:
    | "registered"
    | "waitlisted"
    | "duplicate"
    | "limit_reached"
    | "closed"
    | "grade_mismatch"
    | "not_found";
  position: number | null;
  registration_id: string | null;
};

/** Баталгаажуулах хуудсанд дамжуулах багц */
export type ConfirmationPayload = {
  studentName: string;
  grade: number;
  classGroup: string;
  phone: string;
  results: RegisterResult[];
  at: string;
};

/** find_my_registrations функцээс буцах утга */
export type MyRegistration = {
  registration_id: string;
  club_id: string;
  club_name: string;
  room: string | null;
  teacher: string | null;
  status: RegistrationStatus;
  queue_position: number;
  phone_masked: string;
  created_at: string;
};

/** Админ дэлгэцэд ашиглах бүртгэлийн мөр */
export type AdminRegistration = {
  id: string;
  club_id: string;
  student_name: string;
  grade: number;
  class_group: string;
  parent_phone: string;
  status: RegistrationStatus;
  created_at: string;
  queue_position: number;
};
