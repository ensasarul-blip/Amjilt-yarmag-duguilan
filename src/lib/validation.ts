/** Зөвхөн цифр үлдээнэ: "9911-2233" -> "99112233" */
export function normalizePhone(value: string): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Монголын утас — 8 оронтой */
export function isValidPhone(value: string): boolean {
  return /^\d{8}$/.test(normalizePhone(value));
}

/** "  Бат   Болд " -> "Бат Болд" */
export function cleanName(value: string): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function isValidName(value: string): boolean {
  return cleanName(value).length >= 2;
}

/** ӨС-ийн норм: жиших түлхүүр (SQL дэх public.norm_name-тай ижил) */
export function normName(value: string): string {
  return cleanName(value).toLowerCase();
}
