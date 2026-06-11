import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SwRegister } from "@/components/sw-register";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Gastando",
  description: "Tu app de finanzas personales",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gastando",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <head>
        <meta name="theme-color" content="#00C9A7" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors />
        <SwRegister />
        <PwaInstallBanner />
      </body>
    </html>
  );
}
