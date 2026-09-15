import Header from "@/components/Header";
import MyRegistrations from "@/components/MyRegistrations";
import { ErrorNotice, SetupNotice } from "@/components/Notice";
import { loadPublicData } from "@/lib/data";
import { supabaseConfigured } from "@/lib/supabase/server";

// Хуудсыг 60 секунд кешлэнэ: олон хүн зэрэг орвол өгөгдлийн сан руу
// хүн бүрээр биш, 60 секунд тутамд НЭГ л удаа хандана.
// Энэ хуудас зөвхөн ангийн бүлгийн жагсаалтыг хэрэглэдэг —
// бараг өөрчлөгддөггүй.
export const revalidate = 60;

export default async function MyRegistrationsPage() {
  const configured = supabaseConfigured();
  const data = configured ? await loadPublicData() : null;

  return (
    <>
      <Header subtitle="Миний бүртгэл" />
      <main className="mx-auto max-w-3xl px-4 py-5">
        {!configured ? (
          <SetupNotice />
        ) : data && !data.ok ? (
          <ErrorNotice message={data.error} />
        ) : data && data.ok ? (
          <MyRegistrations groups={data.groups} />
        ) : null}
      </main>
    </>
  );
}
