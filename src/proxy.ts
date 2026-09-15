import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16-ийн "proxy" (өмнө нь middleware гэдэг байсан).
 * Нэвтрэлтийн session-ийг сэргээж, /admin хуудсыг хамгаална.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
