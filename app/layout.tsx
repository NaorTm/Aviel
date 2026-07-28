import type { Metadata } from "next";
import "./globals.css";

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "אביאל BOQ — הצעות מחיר וכתבי כמויות",
  description: "יישום מקומי ליצירת כתבי כמויות והצעות מחיר מקצועיות בעברית",
  icons: {
    icon: `${publicBasePath}/favicon.svg`,
    shortcut: `${publicBasePath}/favicon.svg`,
  },
  openGraph: {
    title: "אביאל BOQ — הצעות מחיר וכתבי כמויות",
    description: "יישום מקומי ליצירת כתבי כמויות והצעות מחיר מקצועיות בעברית",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: `${publicBasePath}/og-aviel-boq.png`,
        width: 1200,
        height: 630,
        alt: "מסמך כתב כמויות מקצועי על גבי תכנית חשמל",
      },
    ],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
