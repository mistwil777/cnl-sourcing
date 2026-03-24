import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import ChatWidget from "@/components/chatbot/ChatWidget";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: {
    default: "CNL Sourcing — Votre partenaire sourcing Vietnam / France",
    template: "%s | CNL Sourcing",
  },
  description:
    "CNL Sourcing connecte les entreprises françaises aux meilleurs fournisseurs vietnamiens. Textile, alimentaire, artisanat.",
  metadataBase: new URL("https://cnlsourcing.com"),
  openGraph: {
    siteName: "CNL Sourcing",
    locale: "fr_FR",
    type: "website",
  },
};

const locales = ["fr", "en", "vi"];

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale)) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-brand-light text-brand-dark antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
          <ChatWidget />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
