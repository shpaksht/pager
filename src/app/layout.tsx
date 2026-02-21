import type { Metadata } from "next";
import { Inter, PT_Serif } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pager",
  description: "Reading tracker and planning app"
};

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body"
});

const ptSerif = PT_Serif({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  variable: "--font-heading"
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${ptSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
