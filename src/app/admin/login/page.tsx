"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(
          authError.message.includes("Invalid login credentials")
            ? "И-мэйл эсвэл нууц үг буруу байна."
            : authError.message,
        );
        return;
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      setError(`Алдаа: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border-2 border-nil-300 bg-white p-5"
    >
      <h2 className="text-lg font-bold text-nil-900">Админ нэвтрэх</h2>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-bold text-nil-800">
            И-мэйл
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-nil-300 px-3"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-bold text-nil-800">
            Нууц үг
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-nil-300 px-3"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-bold text-anhaar-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 min-h-13 w-full rounded-xl bg-nil-800 px-4 py-3 text-base font-bold text-white disabled:opacity-60"
      >
        {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
      </button>

      <p className="mt-4 text-sm text-nil-600">
        Хэрэглэгчийг Supabase самбарын <strong>Authentication → Users</strong>{" "}
        хэсгээс үүсгэнэ. README.md-ийн 4-р алхмыг үзнэ үү.
      </p>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <>
      <Header subtitle="Админ" />
      <main className="mx-auto max-w-md px-4 py-6">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </main>
    </>
  );
}
