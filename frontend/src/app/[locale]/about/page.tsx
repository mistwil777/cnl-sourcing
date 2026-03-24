import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "À propos — Anna Nguyen, CNL Sourcing",
  description: "Découvrez Anna Nguyen, fondatrice franco-vietnamienne de CNL Sourcing, et notre mission.",
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
              <div className="bg-gradient-to-br from-brand-red/10 to-brand-gold/10 rounded-2xl aspect-[4/3] flex items-center justify-center mb-6">
                <span className="text-8xl">👩‍💼</span>
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
                <p className="text-gray-500 leading-relaxed">{t("storyP2")}</p>
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
