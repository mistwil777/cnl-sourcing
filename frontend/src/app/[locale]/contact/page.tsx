import type { Metadata } from "next";
import { Mail, MapPin, Clock } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez CNL Sourcing — Anna répond sous 24h.",
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main>
        <section className="bg-brand-dark text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Nous contacter</h1>
            <p className="text-gray-400 max-w-xl mx-auto">
              Une question, un projet ? Anna répond personnellement sous 24h.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Infos */}
            <div className="space-y-6">
              <h2 className="section-title">Parlons de votre projet</h2>
              <p className="text-gray-500 leading-relaxed">
                Que vous ayez une idée précise ou que vous souhaitiez explorer les possibilités,
                n'hésitez pas à nous écrire. Nous vous répondons avec une première analyse gratuite.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-red/10 rounded-full flex items-center justify-center">
                    <Mail size={18} className="text-brand-red" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
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
                    <p className="text-xs text-gray-400">Localisation</p>
                    <p className="text-brand-dark font-medium">Hô Chi Minh-Ville, Vietnam · France</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-red/10 rounded-full flex items-center justify-center">
                    <Clock size={18} className="text-brand-red" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Délai de réponse</p>
                    <p className="text-brand-dark font-medium">Sous 24h (jours ouvrés)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulaire contact simple */}
            <div className="card">
              <h3 className="font-serif text-xl font-bold text-brand-dark mb-4">Message rapide</h3>
              <form
                action="mailto:cnlsourcingvn@gmail.com"
                method="get"
                encType="text/plain"
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom</label>
                  <input name="from" type="text" className="input" placeholder="Marie Dupont" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                  <input name="subject" type="text" className="input" placeholder="Demande de renseignement" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea name="body" rows={5} className="input resize-none" placeholder="Décrivez votre demande..." />
                </div>
                <button type="submit" className="btn-primary w-full justify-center">
                  Envoyer
                </button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-4">
                Ou utilisez le chatbot IA en bas à droite pour une réponse immédiate.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
