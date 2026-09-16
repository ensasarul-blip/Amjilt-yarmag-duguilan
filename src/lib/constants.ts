/** Сургуулийн нэр — толгой хэсэгт харагдана */
export const SCHOOL_NAME = "АМЖИЛТ КИБЕР ЯАРМАГ СУРГУУЛЬ";

/** Нэг сурагч хэдэн дугуйлан сонгож болох (ӨС-ийн тохиргоо давамгайлна) */
export const DEFAULT_MAX_CLUBS = 2;

/** Хэдэн суудал үлдэхэд "Цөөн суудал үлдлээ" гэж анхааруулах вэ */
export const LOW_SEAT_THRESHOLD = 3;

export const WEEKDAYS = [
  { value: 1, name: "Даваа", short: "Да" },
  { value: 2, name: "Мягмар", short: "Мя" },
  { value: 3, name: "Лхагва", short: "Лх" },
  { value: 4, name: "Пүрэв", short: "Пү" },
  { value: 5, name: "Баасан", short: "Ба" },
  { value: 6, name: "Бямба", short: "Бя" },
  { value: 7, name: "Ням", short: "Ня" },
] as const;

export function weekdayName(value: number | null | undefined): string {
  if (value == null) return "Цаг тодорхойгүй";
  return WEEKDAYS.find((d) => d.value === value)?.name ?? "—";
}

export type LevelCode = "baga" | "dund" | "ahlah";

export const LEVELS: { value: LevelCode; name: string; grades: number[] }[] = [
  { value: "baga", name: "Бага анги", grades: [1, 2, 3, 4, 5] },
  { value: "dund", name: "Дунд анги", grades: [6, 7, 8, 9] },
  { value: "ahlah", name: "Ахлах анги", grades: [10, 11, 12] },
];

export function levelName(value: string | null | undefined): string {
  return LEVELS.find((l) => l.value === value)?.name ?? "—";
}

export function levelOfGrade(grade: number): LevelCode {
  if (grade <= 5) return "baga";
  if (grade <= 9) return "dund";
  return "ahlah";
}

export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Бүртгэлийн үр дүнгийн монгол тайлбар */
export const STATUS_LABEL: Record<string, string> = {
  registered: "Бүртгэгдсэн",
  waitlisted: "Хүлээлгийн жагсаалт",
  cancelled: "Цуцлагдсан",
  duplicate: "Аль хэдийн бүртгэлтэй",
  limit_reached: "Дугуйлангийн хязгаарт хүрсэн",
  closed: "Бүртгэл хаалттай",
  grade_mismatch: "Анги тохирохгүй",
  not_found: "Дугуйлан олдсонгүй",
};

/** ӨС-ээс ирэх алдааны кодыг монголоор тайлбарлана */
export const DB_ERROR_MESSAGE: Record<string, string> = {
  БҮРТГЭЛ_ХААЛТТАЙ: "Бүртгэл одоогоор хаалттай байна.",
  НЭР_БУРУУ: "Сурагчийн овог нэрийг бүтнээр нь бичнэ үү.",
  УТАС_БУРУУ: "Утасны дугаар 8 оронтой байх ёстой.",
  АНГИ_БУРУУ: "Ангиа сонгоно уу.",
  БҮЛЭГ_БУРУУ: "Бүлгээ зөв сонгоно уу.",
  ДУГУЙЛАН_СОНГООГҮЙ: "Дор хаяж нэг дугуйлан сонгоно уу.",
  БҮРТГЭЛ_ОЛДСОНГҮЙ: "Бүртгэл олдсонгүй.",
  БҮРТГЭЛ_ТААРАХГҮЙ: "Нэр, анги, бүлэг таарахгүй байна.",
  ТОХИРГОО_ОЛДСОНГҮЙ: "Системийн тохиргоо олдсонгүй.",
  ТҮВШИН_ЭХЛЭЭГҮЙ: "Энэ ангийн бүртгэл хараахан нээгдээгүй байна.",
  ТҮВШИН_ДУУССАН: "Энэ ангийн бүртгэлийн хугацаа дууссан байна.",
};
