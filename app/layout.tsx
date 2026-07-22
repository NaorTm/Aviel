import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "אביאל BOQ — הצעות מחיר וכתבי כמויות",
  description: "יישום מקומי ליצירת כתבי כמויות והצעות מחיר מקצועיות בעברית",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "אביאל BOQ — הצעות מחיר וכתבי כמויות",
    description: "יישום מקומי ליצירת כתבי כמויות והצעות מחיר מקצועיות בעברית",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: "/og-aviel-boq.png",
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
