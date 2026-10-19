import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { Flash } from "@/components/flash";
import { PaymentBanner } from "@/components/payment-banner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business OS",
  description: "The back office for a one-person service business. Bots draft the work. The founder approves anything risky.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable} antialiased`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
          Skip to content
        </a>
        <PaymentBanner />
        <Suspense fallback={null}>
          <Flash />
        </Suspense>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
