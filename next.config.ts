import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Excel үүсгэх сан нь зөвхөн сервер талд ажиллана
  serverExternalPackages: ["exceljs"],

  // ЗӨВХӨН ХӨГЖҮҮЛЭЛТИЙН ГОРИМД хамаарна (npm run dev).
  // Гар утас гэх мэт өөр төхөөрөмжөөс локал сүлжээгээр
  // (жишээ нь http://192.168.5.152:3000) орж үзэхийг зөвшөөрнө.
  // Үгүй бол Next.js "WebSocket handshake failed" гэсэн алдаа заана.
  // Vercel дээр энэ тохиргоо огт нөлөөлөхгүй.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*"],
};

export default nextConfig;
