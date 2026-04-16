import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "À propos — Anna Nguyen, fondatrice CNL Sourcing",
  description:
    "Anna Nguyen, fondatrice franco-vietnamienne de CNL Sourcing. 10 ans d'expérience Vietnam, négociation en vietnamien, réseau de fournisseurs audités à Hanoï et Hô Chi Minh-Ville.",
  keywords: [
    "Anna Nguyen sourcing Vietnam",
    "fondatrice CNL Sourcing",
    "agent sourcing franco-vietnamien",
    "expert import Vietnam France",
    "Toulouse sourcing international",
  ],
  alternates: {
    canonical: "https://cnlsourcing.com/fr/about",
    languages: {
      fr: "https://cnlsourcing.com/fr/about",
      en: "https://cnlsourcing.com/en/about",
      vi: "https://cnlsourcing.com/vi/about",
      "x-default": "https://cnlsourcing.com/fr/about",
    },
  },
  openGraph: {
    title: "À propos — Anna Nguyen, fondatrice CNL Sourcing",
    description:
      "Anna Nguyen, fondatrice franco-vietnamienne de CNL Sourcing. 10 ans d'expérience Vietnam, négociation en vietnamien.",
    url: "https://cnlsourcing.com/fr/about",
    images: [
      {
        url: "/images/anna.jpg",
        width: 800,
        height: 600,
        alt: "Anna Nguyen — Fondatrice CNL Sourcing",
      },
    ],
  },
};

const valueKeys = [
  { key: "trust",  emoji: "🤝" },
  { key: "rigor",  emoji: "🔍" },
  { key: "bridge", emoji: "🌏" },
  { key: "speed",  emoji: "⚡" },
] as const;

export default function AboutPage() {
  const t = useTranslations("about_page");

  return (
    <>
      <Header />
      <main>
        <section className="bg-brand-dark text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">{t("heroTitle")}</h1>
            <p className="text-gray-400 max-w-xl mx-auto">{t("heroSubtitle")}</p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="rounded-2xl overflow-hidden aspect-[4/3] mb-6 relative">
                <Image src="/images/anna.jpg" alt="Anna Nguyen — Fondatrice CNL Sourcing" fill className="object-cover" priority />
              </div>
              <div className="card">
                <h3 className="font-serif text-xl font-bold text-brand-dark mb-1">{t("founderTitle")}</h3>
                <p className="text-brand-red text-sm font-medium mb-3">{t("founderRole")}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{t("founderBio")}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="section-title">{t("storyTitle")}</h2>
                <p className="text-gray-500 leading-relaxed mb-4">{t("storyP1")}</p>
                <p className="text-gray-500 leading-relaxed mb-4">{t("storyP2")}</p>
              </div>

              <div>
                <h3 className="font-serif text-lg font-bold text-brand-dark mb-3">{t("anecdoteTitle")}</h3>
                <blockquote className="border-l-4 border-brand-red pl-4 italic text-gray-500 text-sm leading-relaxed mb-4">
                  {t("storyP3")}
                </blockquote>
                <p className="text-brand-red font-semibold text-sm italic">« {t("quote")} »</p>
              </div>

              <div>
                <h3 className="font-serif text-lg font-bold text-brand-dark mb-3">{t("certifTitle")}</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  {(["certif1", "certif2", "certif3", "certif4"] as const).map((k) => (
                    <li key={k} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-red shrink-0" />
                      {t(k)}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-400 mt-2">{t("locationLabel")} : {t("locationValue")}</p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-bold text-brand-dark mb-3">{t("valuesTitle")}</h3>
                <div className="space-y-3">
                  {valueKeys.map(({ key, emoji }) => (
                    <div key={key} className="flex items-start gap-3">
                      <span className="text-2xl">{emoji}</span>
                      <div>
                        <p className="font-semibold text-brand-dark text-sm">{t(`values.${key}.title`)}</p>
                        <p className="text-gray-500 text-sm">{t(`values.${key}.desc`)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Link href="/devis" className="btn-primary">
                {t("ctaButton")} <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
