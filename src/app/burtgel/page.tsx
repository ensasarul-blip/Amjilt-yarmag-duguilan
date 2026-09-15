import Header from "@/components/Header";
import MyRegistrations from "@/components/MyRegistrations";
import { ErrorNotice, SetupNotice } from "@/components/Notice";
import { loadPublicData } from "@/lib/data";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
