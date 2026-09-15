import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import ClubForm from "@/components/admin/ClubForm";
import { SetupNotice } from "@/components/Notice";
import { createClubAction } from "@/app/admin/actions";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewClubPage() {
  if (!supabaseConfigured()) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <SetupNotice />
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <AdminHeader email={user?.email} />
      <main className="mx-auto max-w-3xl px-4 py-5">
        <Link href="/admin" className="text-sm font-bold text-nil-800 underline">
          ← Хяналтын самбар
        </Link>
        <h2 className="mt-3 mb-3 text-xl font-bold text-nil-900">
          Шинэ дугуйлан нэмэх
        </h2>
        <ClubForm action={createClubAction} submitLabel="Дугуйлан нэмэх" />
      </main>
    </>
  );
}
