import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Нийтийн (нэвтрэхгүй) уншилтад зориулсан холболт.
 *
 * ЯАГААД ТУСДАА ВЭ: `server.ts` доторх холболт нь cookie уншдаг тул Next.js
 * түүнийг ашигласан хуудсыг ХЭЗЭЭ Ч кешлэж чадахгүй — хүн бүрийн хувьд
 * дахин дахин өгөгдлийн сан руу ханддаг. Нийтийн хуудсанд cookie огт
 * хэрэггүй учир энэ холболтыг ашиглаад хуудсыг кешлэх боломжтой болгоно.
 */
export function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
