import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "루나&별 길드",
  description: "루나 & 별 길드 멤버 현황",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  openGraph: {
    images: ['/hero.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <style>{`next-devtools { display: none !important; }`}</style>
      </head>
      <body className={notoSansKR.className}>{children}</body>
    </html>
  );
}
