import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Geist, Inter, Nunito_Sans } from "next/font/google";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const nunito = Nunito_Sans({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Over Drive Booking",
  description: "Appointment booking for service businesses.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${inter.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Suspense fallback={null}>
          <Localized>{children}</Localized>
        </Suspense>
      </body>
    </html>
  );
}

async function Localized({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}
