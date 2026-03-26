import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import DevisForm from "@/components/forms/DevisForm";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Demander un devis",
  description: "Décrivez votre projet de sourcing Vietnam. Audit sourcing à partir de 250€, réponse sous 48h.",
};

const steps = [
  { n: "1", label: "Vous remplissez le formulaire" },
  { n: "2", label: "Anna analyse votre demande sous 48h" },
  { n: "3", label: "Devis détaillé & Top 3 fournisseurs" },
];

export default function DevisPage() {
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Titre */}
        <div className="text-center mb-12">
          <h1 className="section-title">Demander un devis gratuit</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Décrivez votre besoin en quelques minutes. Anna analyse votre demande et revient vers vous
            avec une sélection de fournisseurs qualifiés.
          </p>
        </div>

        {/* Étapes */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
          {steps.map((s) => (
            <div key={s.n} className="flex items-center gap-3 bg-white rounded-xl px-5 py-3 shadow-sm">
              <span className="w-8 h-8 rounded-full bg-brand-red text-white text-sm font-bold flex items-center justify-center shrink-0">
                {s.n}
              </span>
              <span className="text-sm text-gray-700">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulaire */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-8">
            <DevisForm />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="card border border-brand-gold/30">
              <h3 className="font-serif text-lg font-bold text-brand-dark mb-3">
                Ce que vous recevrez
              </h3>
              <ul className="space-y-2">
                {[
                  "Analyse de faisabilité complète",
                  "Top 3 fournisseurs présélectionnés",
                  "Estimation des coûts et délais",
                  "Points d'attention réglementaires (douane, EVFTA)",
                  "Recommandation personnalisée",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card border border-brand-red/20 bg-brand-red/5">
              <p className="text-sm text-brand-red font-semibold leading-relaxed">
                Audit de sourcing à partir de 250€ • Devis gratuit après premier échange
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Réponse sous 48h • Contrat de prestation signé systématiquement
              </p>
            </div>

            <div className="card bg-brand-dark text-white">
              <h3 className="font-serif text-lg font-bold mb-2">Questions ?</h3>
              <p className="text-gray-400 text-sm mb-4">
                Anna répond directement à vos questions par WhatsApp ou email.
              </p>
              <a
                href="mailto:cnlsourcingvn@gmail.com"
                className="text-brand-gold text-sm font-medium hover:underline"
              >
                cnlsourcingvn@gmail.com →
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
