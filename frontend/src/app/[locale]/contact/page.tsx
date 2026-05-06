import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Mail, MapPin, Clock, Calendar } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ContactForm from "@/components/forms/ContactForm";

export const metadata: Metadata = {
  title: "Contact — CNL Sourcing Toulouse",
  description:
    "Contactez CNL Sourcing — Anna Nguyen répond sous 48h. Email : cnlsourcingvn@gmail.com. Basé à Toulouse, Occitanie.",
  keywords: [
    "contact CNL Sourcing",
    "agent sourcing Vietnam Toulouse",
    "contacter agent sourcing",
    "sourcing Vietnam Occitanie",
  ],
  alternates: {
    canonical: "https://cnlsourcing.com/fr/contact",
    languages: {
      fr: "https://cnlsourcing.com/fr/contact",
      en: "https://cnlsourcing.com/en/contact",
      vi: "https://cnlsourcing.com/vi/contact",
      "x-default": "https://cnlsourcing.com/fr/contact",
    },
  },
  openGraph: {
    title: "Contact — CNL Sourcing Toulouse",
    description: "Contactez Anna Nguyen, agent sourcing Vietnam basé à Toulouse. Réponse sous 48h.",
    url: "https://cnlsourcing.com/fr/contact",
    images: [{ url: "https://cnlsourcing.com/api/og?title=Contactez%20CNL%20Sourcing&subtitle=Anna%20Nguyen%20r%C3%A9pond%20sous%2048h%20%E2%80%94%20Toulouse%2C%20Occitanie", width: 1200, height: 630, alt: "Contact CNL Sourcing" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://cnlsourcing.com/api/og?title=Contactez%20CNL%20Sourcing&subtitle=Anna%20Nguyen%20r%C3%A9pond%20sous%2048h%20%E2%80%94%20Toulouse%2C%20Occitanie"],
  },
};

export default function ContactPage() {
  const t = useTranslations("contact_page");

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

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Infos */}
            <div className="space-y-6">
              <h2 className="section-title">{t("sectionTitle")}</h2>
              <p className="text-gray-500 leading-relaxed">{t("sectionText")}</p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-red/10 rounded-full flex items-center justify-center">
                    <Mail size={18} className="text-brand-red" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t("emailLabel")}</p>
                    <a href="mailto:cnlsourcingvn@gmail.com" className="text-brand-dark font-medium hover:text-brand-red">
                      cnlsourcingvn@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-red/10 rounded-full flex items-center justify-center">
                    <MapPin size={18} className="text-brand-red" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t("locationLabel")}</p>
                    <p className="text-brand-dark font-medium">{t("location")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-red/10 rounded-full flex items-center justify-center">
                    <Calendar size={18} className="text-brand-red" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t("hoursLabel")}</p>
                    <p className="text-brand-dark font-medium">{t("hours")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-red/10 rounded-full flex items-center justify-center">
                    <Clock size={18} className="text-brand-red" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t("delayLabel")}</p>
                    <p className="text-brand-dark font-medium">{t("delay")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulaire */}
            <div className="card">
              <h3 className="font-serif text-xl font-bold text-brand-dark mb-4">{t("formTitle")}</h3>
              <ContactForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
