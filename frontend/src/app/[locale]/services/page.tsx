import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Nos services de sourcing Vietnam",
  description: "Textile, alimentaire, artisanat : découvrez tous nos services de sourcing Vietnam → France.",
};

const services = [
  {
    icon: "👗",
    title: "Textile & Mode",
    desc: "Vêtements, accessoires, maroquinerie, tissus techniques. Nous travaillons avec des usines certifiées BSCI, WRAP et SA8000.",
    features: [
      "Sélection et audit fournisseurs",
      "Contrôle qualité sur site",
      "Gestion des certifications",
      "Suivi production en temps réel",
    ],
  },
  {
    icon: "🍜",
    title: "Alimentaire & Épicerie",
    desc: "Café, thé, épices, sauces, produits bio. Conformité aux normes HACCP et réglementations douanières européennes.",
    features: [
      "Vérification certifications sanitaires",
      "Analyse réglementaire import UE",
      "Coordination laboratoires d'analyse",
      "Gestion étiquetage multilingue",
    ],
  },
  {
    icon: "🪴",
    title: "Artisanat & Décoration",
    desc: "Mobilier laqué, céramique, bambou, rotin. Accès direct aux villages artisanaux du Vietnam.",
    features: [
      "Sourcing artisans locaux",
      "Personnalisation & OEM",
      "Photos et vidéos de production",
      "Conditionnement export sécurisé",
    ],
  },
  {
    icon: "💄",
    title: "Cosmétiques & Beauté",
    desc: "Produits naturels à base de plantes locales. Conformité réglementation cosmétique UE (CPNP).",
    features: [
      "Vérification dossiers techniques",
      "Tests dermatologiques",
      "Conformité REACH et CPNP",
      "Private label disponible",
    ],
  },
];

export default function ServicesPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero section */}
        <section className="bg-brand-dark text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              Nos services de sourcing
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              De la recherche fournisseur au contrôle qualité, CNL Sourcing prend en charge
              chaque étape de votre approvisionnement au Vietnam.
            </p>
          </div>
        </section>

        {/* Services grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((s) => (
              <div key={s.title} className="card group">
                <div className="text-5xl mb-4">{s.icon}</div>
                <h2 className="font-serif text-2xl font-bold text-brand-dark mb-3">{s.title}</h2>
                <p className="text-gray-500 mb-5 leading-relaxed">{s.desc}</p>
                <ul className="space-y-2">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={14} className="text-brand-red shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Process */}
        <section className="bg-brand-light py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="section-title text-center mb-12">Notre processus</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { n: "01", title: "Analyse", desc: "Étude de votre besoin et analyse de faisabilité IA" },
                { n: "02", title: "Sourcing", desc: "Identification et sélection des meilleurs fournisseurs" },
                { n: "03", title: "Négociation", desc: "Négociation des prix, délais et conditions" },
                { n: "04", title: "Suivi", desc: "Contrôle qualité, logistique et livraison" },
              ].map((step) => (
                <div key={step.n} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-brand-red text-white font-bold text-lg
                                  flex items-center justify-center mx-auto mb-3 font-serif">
                    {step.n}
                  </div>
                  <h3 className="font-semibold text-brand-dark mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-500">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 text-center">
          <h2 className="font-serif text-3xl font-bold text-brand-dark mb-4">
            Démarrez votre projet
          </h2>
          <p className="text-gray-500 mb-8">Devis gratuit · Réponse sous 24h</p>
          <Link href="/devis" className="btn-primary text-base py-3 px-10">
            Demander un devis <ArrowRight size={18} />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
