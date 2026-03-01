import type { Metadata, Viewport } from "next";
import { Inter, PT_Serif } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pager",
  description: "Reading tracker and planning app",
  manifest: "/manifest.webmanifest",
  applicationName: "Pager",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pager"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  }
};

export const viewport: Viewport = {
  themeColor: "#6f482a"
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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${ptSerif.variable}`}>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
