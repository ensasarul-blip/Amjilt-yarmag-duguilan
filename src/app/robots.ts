import type { MetadataRoute } from "next";

/**
 * Хайлтын системд (Google гэх мэт) зориулсан заавар.
 * Админ болон дотоод хаягуудыг индексжүүлэхийг хориглоно.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/", "/amjilt"],
    },
  };
}
