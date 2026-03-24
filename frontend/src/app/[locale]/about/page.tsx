import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "À propos — Anna Nguyen, CNL Sourcing",
  description: "Découvrez Anna Nguyen, fondatrice franco-vietnamienne de CNL Sourcing, et notre mission.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        <section className="bg-brand-dark text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">À propos de CNL Sourcing</h1>
            <p className="text-gray-400 max-w-xl mx-auto">
              Une entreprise fondée sur la confiance, l'expertise culturelle et la passion du commerce franco-vietnamien.
            </p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Portrait Anna */}
            <div>
              <div className="bg-gradient-to-br from-brand-red/10 to-brand-gold/10 rounded-2xl aspect-[4/3]
                              flex items-center justify-center mb-6">
                <span className="text-8xl">👩‍💼</span>
              </div>
              <div className="card">
                <h3 className="font-serif text-xl font-bold text-brand-dark mb-1">
                  Nguyen Cao Phuong Anh
                </h3>
                <p className="text-brand-red text-sm font-medium mb-3">Fondatrice & Directrice</p>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Franco-vietnamienne, Anna a grandi entre les deux cultures. Après des études de commerce
                  international, elle a fondé CNL Sourcing pour aider les entreprises françaises à accéder
                  au marché vietnamien en toute confiance.
                </p>
              </div>
            </div>

            {/* Notre histoire */}
            <div className="space-y-6">
              <div>
                <h2 className="section-title">Notre histoire</h2>
                <p className="text-gray-500 leading-relaxed mb-4">
                  CNL Sourcing est née d'un constat simple : trop d'entreprises françaises renoncent à sourcer
                  au Vietnam faute de contacts locaux fiables, de maîtrise linguistique ou de connaissance
                  réglementaire.
                </p>
                <p className="text-gray-500 leading-relaxed">
                  Grâce à son réseau familial et professionnel au Vietnam, Anna propose un service clé en main,
                  de la recherche fournisseur à la livraison en France — avec une transparence totale à chaque étape.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-bold text-brand-dark mb-3">Nos valeurs</h3>
                <div className="space-y-3">
                  {[
                    { emoji: "🤝", title: "Confiance", desc: "Relation directe et transparente avec chaque client" },
                    { emoji: "🔍", title: "Rigueur", desc: "Audit systématique des fournisseurs avant toute recommandation" },
                    { emoji: "🌏", title: "Pont culturel", desc: "Compréhension profonde des deux cultures pour éviter les malentendus" },
                    { emoji: "⚡", title: "Réactivité", desc: "Réponse sous 24h, suivi proactif de chaque dossier" },
                  ].map(({ emoji, title, desc }) => (
                    <div key={title} className="flex items-start gap-3">
                      <span className="text-2xl">{emoji}</span>
                      <div>
                        <p className="font-semibold text-brand-dark text-sm">{title}</p>
                        <p className="text-gray-500 text-sm">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Link href="/devis" className="btn-primary">
                Travailler avec Anna <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
