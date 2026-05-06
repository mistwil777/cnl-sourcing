import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Nos services de sourcing Vietnam",
  description:
    "Sourcing textile, agroalimentaire et artisanat Vietnam → France. Groupage fret, assistance douanière EVFTA. Audit à partir de 250€, réponse sous 48h.",
  keywords: [
    "services sourcing Vietnam",
    "sourcing textile Vietnam France",
    "import agroalimentaire Vietnam",
    "groupage fret Vietnam",
    "douane import Vietnam",
    "EVFTA import France",
    "artisanat Vietnam import",
  ],
  alternates: {
    canonical: "https://cnlsourcing.com/fr/services",
    languages: {
      fr: "https://cnlsourcing.com/fr/services",
      en: "https://cnlsourcing.com/en/services",
      vi: "https://cnlsourcing.com/vi/services",
      "x-default": "https://cnlsourcing.com/fr/services",
    },
  },
  openGraph: {
    title: "Services de sourcing Vietnam | CNL Sourcing",
    description:
      "Sourcing textile, agroalimentaire et artisanat Vietnam → France. Groupage fret, assistance douanière EVFTA.",
    url: "https://cnlsourcing.com/fr/services",
    images: [{ url: "https://cnlsourcing.com/api/og?title=Services%20de%20sourcing%20Vietnam&subtitle=Textile%20%C2%B7%20Agroalimentaire%20%C2%B7%20Artisanat%20%E2%80%94%20Groupage%20fret%20%26%20assistance%20douani%C3%A8re%20EVFTA", width: 1200, height: 630, alt: "Services sourcing Vietnam — CNL Sourcing" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://cnlsourcing.com/api/og?title=Services%20de%20sourcing%20Vietnam&subtitle=Textile%20%C2%B7%20Agroalimentaire%20%C2%B7%20Artisanat%20%E2%80%94%20Groupage%20fret%20%26%20assistance%20douani%C3%A8re%20EVFTA"],
  },
};

const serviceKeys = ["sourcing", "groupage", "douane"] as const;
const serviceIcons: Record<string, string> = {
  sourcing: "🔍",
  groupage: "📦",
  douane: "🛃",
};

export default function ServicesPage() {
  const t = useTranslations("services_page");

  return (
    <>
      <Header />
      <main>
        <section className="bg-brand-dark text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">{t("heroTitle")}</h1>
            <p className="text-gray-400 max-w-2xl mx-auto">{t("heroSubtitle")}</p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {serviceKeys.map((key) => (
              <div key={key} className="card group">
                <div className="text-5xl mb-4">{serviceIcons[key]}</div>
                <h2 className="font-serif text-2xl font-bold text-brand-dark mb-3">{t(`services.${key}.title`)}</h2>
                <p className="text-gray-500 mb-5 leading-relaxed">{t(`services.${key}.desc`)}</p>
                <ul className="space-y-2 mb-4">
                  {(["f1", "f2", "f3", "f4"] as const).map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={14} className="text-brand-red shrink-0" />
                      {t(`services.${key}.${f}`)}
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-semibold text-brand-red">{t(`services.${key}.price`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-brand-light py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="section-title text-center mb-12">{t("processTitle")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {(["s1", "s2", "s3", "s4", "s5", "s6"] as const).map((s) => (
                <div key={s} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-brand-red text-white font-bold text-lg flex items-center justify-center mx-auto mb-3 font-serif">
                    {t(`steps.${s}.n`)}
                  </div>
                  <h3 className="font-semibold text-brand-dark mb-1">{t(`steps.${s}.title`)}</h3>
                  <p className="text-sm text-gray-500">{t(`steps.${s}.desc`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 text-center">
          <h2 className="font-serif text-3xl font-bold text-brand-dark mb-4">{t("ctaTitle")}</h2>
          <p className="text-gray-500 mb-8">{t("ctaSubtitle")}</p>
          <Link href="/devis" className="btn-primary text-base py-3 px-10">
            {t("ctaButton")} <ArrowRight size={18} />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
