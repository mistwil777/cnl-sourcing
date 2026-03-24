import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight, Shield, Clock, Globe, TrendingUp } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function HomePage() {
  const t = useTranslations();

  return (
    <>
      <Header />
      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative bg-gradient-to-br from-brand-dark via-red-950 to-brand-dark text-white overflow-hidden">
          {/* Motif décoratif */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-96 h-96 bg-brand-gold rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-red rounded-full translate-x-1/3 translate-y-1/3" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
            <div className="max-w-2xl">
              {/* Badge */}
              <span className="inline-flex items-center gap-2 bg-brand-gold/20 text-brand-gold text-sm font-medium px-3 py-1 rounded-full mb-6">
                🇻🇳 Vietnam · 🇫🇷 France
              </span>

              <h1 className="font-serif text-4xl md:text-6xl font-bold leading-tight mb-6">
                {t("hero.title")}
              </h1>

              <p className="text-lg md:text-xl text-gray-300 leading-relaxed mb-8">
                {t("hero.subtitle")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/devis" className="btn-primary text-base py-3 px-8">
                  {t("hero.cta")} <ArrowRight size={18} />
                </Link>
                <Link href="/services" className="btn-secondary border-white text-white hover:bg-white hover:text-brand-dark text-base py-3 px-8">
                  Nos services
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <section className="bg-brand-red text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: "50+", label: "Fournisseurs vérifiés" },
                { value: "98%", label: "Clients satisfaits" },
                { value: "15j", label: "Délai moyen devis" },
                { value: "3", label: "Langues parlées" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold font-serif">{stat.value}</div>
                  <div className="text-sm text-red-200 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Services ─────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="section-title">Nos domaines d'expertise</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              De la recherche fournisseur au contrôle qualité, nous gérons chaque étape de votre sourcing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "👗",
                title: "Textile & Mode",
                desc: "Vêtements, accessoires, tissus techniques. Fournisseurs certifiés BSCI et WRAP.",
              },
              {
                icon: "🍜",
                title: "Alimentaire & Epicerie",
                desc: "Café, épices, sauces, produits biologiques. Conformité aux normes européennes.",
              },
              {
                icon: "🪴",
                title: "Artisanat & Décoration",
                desc: "Mobilier, céramique, laque, bambou. Savoir-faire artisanal authentique.",
              },
            ].map((service) => (
              <div key={service.title} className="card text-center group hover:-translate-y-1 transition-transform duration-300">
                <div className="text-5xl mb-4">{service.icon}</div>
                <h3 className="font-serif text-xl font-bold text-brand-dark mb-2">{service.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pourquoi CNL ─────────────────────────────────────────────── */}
        <section className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="section-title">Pourquoi choisir CNL Sourcing ?</h2>
                <p className="text-gray-500 mb-8 leading-relaxed">
                  Anna, notre fondatrice franco-vietnamienne, s'appuie sur un réseau de fournisseurs
                  sélectionnés et vérifiés pour vous offrir un sourcing sécurisé et transparent.
                </p>

                <ul className="space-y-4">
                  {[
                    { icon: Shield, text: "Fournisseurs audités et certifiés" },
                    { icon: Clock, text: "Réponse sous 24h, devis sous 15 jours" },
                    { icon: Globe, text: "Maîtrise du français, anglais et vietnamien" },
                    { icon: TrendingUp, text: "Suivi en temps réel de vos commandes" },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-red/10 flex items-center justify-center shrink-0">
                        <Icon size={16} className="text-brand-red" />
                      </div>
                      <span className="text-gray-700">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Placeholder image */}
              <div className="bg-gradient-to-br from-brand-red/10 to-brand-gold/10 rounded-2xl aspect-square flex items-center justify-center">
                <span className="text-8xl">🇻🇳</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA final ────────────────────────────────────────────────── */}
        <section className="bg-brand-dark text-white py-16">
          <div className="max-w-3xl mx-auto text-center px-4">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              Prêt à lancer votre sourcing ?
            </h2>
            <p className="text-gray-400 mb-8">
              Décrivez votre projet et recevez une analyse de faisabilité sous 24h — gratuitement.
            </p>
            <Link href="/devis" className="btn-primary text-base py-3 px-10">
              Démarrer maintenant <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
