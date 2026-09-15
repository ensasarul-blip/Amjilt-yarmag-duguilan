import type { Metadata, Viewport } from "next";
import { SCHOOL_NAME } from "@/lib/constants";
import "./globals.css";

const DESCRIPTION =
  "Амжилт Кибер Яармаг сургуулийн хичээлээс гадуурх сургалт, дугуйлангийн бүртгэл.";

export const metadata: Metadata = {
  title: `Дугуйлангийн бүртгэл | ${SCHOOL_NAME}`,
  description: DESCRIPTION,
  applicationName: SCHOOL_NAME,
  // src/app/icon.png ба apple-icon.png файлыг Next.js өөрөө холбоно
  openGraph: {
    title: `Дугуйлангийн бүртгэл | ${SCHOOL_NAME}`,
    description: DESCRIPTION,
    type: "website",
    locale: "mn_MN",
    images: [{ url: "/og.webp", width: 1200, height: 630, alt: SCHOOL_NAME }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2E1A4F",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn">
      <body className="min-h-dvh bg-nil-100 text-nil-900 antialiased">
        {children}
      </body>
    </html>
  );
}
