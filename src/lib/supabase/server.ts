import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Сервер дээр ажиллах Supabase холболт */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component дотроос бичих боломжгүй — middleware хариуцна
          }
        },
      },
    },
  );
}

/** Тохиргоо дутуу бол ойлгомжтой мэдэгдэнэ */
export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
