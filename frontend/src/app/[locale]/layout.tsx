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
    default: "CNL Sourcing — Agent de sourcing Vietnam France",
    template: "%s | CNL Sourcing",
  },
  description:
    "Agent de sourcing Vietnam pour PME françaises. Textile, agroalimentaire, artisanat — fournisseurs audités, négociation en vietnamien, tarifs locaux garantis. Basé à Toulouse.",
  metadataBase: new URL("https://cnlsourcing.com"),
  keywords: [
    "sourcing Vietnam France",
    "agent sourcing Vietnam",
    "fournisseur Vietnam",
    "importation Vietnam PME",
    "sourcing textile Vietnam",
    "agent d'achat Vietnam",
    "sourcing B2B Vietnam",
    "importateur Vietnam France",
    "sourcing agroalimentaire Vietnam",
    "artisanat Vietnam import",
    "CNL Sourcing",
    "Anna Nguyen sourcing",
  ],
  authors: [{ name: "Anna Nguyen", url: "https://cnlsourcing.com/fr/about" }],
  creator: "CNL Sourcing",
  publisher: "CNL Sourcing",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    siteName: "CNL Sourcing",
    locale: "fr_FR",
    alternateLocale: ["en_US", "vi_VN"],
    type: "website",
    title: "CNL Sourcing — Agent de sourcing Vietnam France",
    description:
      "Agent de sourcing Vietnam pour PME françaises. Textile, agroalimentaire, artisanat — fournisseurs audités, négociation en vietnamien.",
    url: "https://cnlsourcing.com/fr",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "CNL Sourcing — Agent sourcing Vietnam France",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "CNL Sourcing — Agent de sourcing Vietnam France",
    description:
      "Agent de sourcing Vietnam pour PME françaises. Textile, agroalimentaire, artisanat.",
    images: ["/icons/icon-512.png"],
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  verification: {},
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    name: "CNL Sourcing",
    url: "https://cnlsourcing.com",
    logo: "https://cnlsourcing.com/icons/icon-512.png",
    image: "https://cnlsourcing.com/icons/icon-512.png",
    description:
      "Agent de sourcing Vietnam pour PME françaises. Textile, agroalimentaire, artisanat — fournisseurs audités, négociation en vietnamien, tarifs locaux garantis.",
    email: "cnlsourcingvn@gmail.com",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Toulouse",
      addressRegion: "Occitanie",
      addressCountry: "FR",
    },
    areaServed: [
      { "@type": "Country", "name": "France" },
      { "@type": "Country", "name": "Vietnam" },
    ],
    founder: {
      "@type": "Person",
      name: "Anna Nguyen",
      jobTitle: "Fondatrice & Agent de sourcing",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services de sourcing Vietnam",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Sourcing textile Vietnam" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Sourcing agroalimentaire Vietnam" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Sourcing artisanat Vietnam" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Groupage fret Vietnam France" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Assistance douanière import Vietnam" } },
      ],
    },
    priceRange: "€€",
    knowsLanguage: ["fr", "vi", "en"],
  };

  return (
    <html lang={locale} className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#C0392B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CNL Admin" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-brand-light text-brand-dark antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <NextIntlClientProvider messages={messages}>
          {children}
          <ChatWidget />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
