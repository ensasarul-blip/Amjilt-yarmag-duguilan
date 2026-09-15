import Header from "@/components/Header";
import RegistrationForm from "@/components/RegistrationForm";
import { ErrorNotice, SetupNotice } from "@/components/Notice";
import { loadPublicData } from "@/lib/data";
import { supabaseConfigured } from "@/lib/supabase/server";

// Суудлын тоо байнга шинэ байх ёстой
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const configured = supabaseConfigured();
  const data = configured ? await loadPublicData() : null;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-5">
        {!configured ? (
          <SetupNotice />
        ) : data && !data.ok ? (
          <ErrorNotice message={data.error} />
        ) : data && data.ok ? (
          <RegistrationForm
            clubs={data.clubs}
            groups={data.groups}
            settings={data.settings}
          />
        ) : null}
      </main>
    </>
  );
}
