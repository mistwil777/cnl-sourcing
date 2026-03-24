import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-gray-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <span className="font-serif text-2xl font-bold text-white">
              CNL <span className="text-brand-gold">Sourcing</span>
            </span>
            <p className="mt-3 text-sm leading-relaxed">
              Votre partenaire de confiance pour le sourcing Vietnam – France.
              Textile, alimentaire, artisanat.
            </p>
          </div>

          {/* Liens */}
          <div>
            <h3 className="text-white font-semibold mb-3">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-brand-gold transition-colors">Accueil</Link></li>
              <li><Link href="/services" className="hover:text-brand-gold transition-colors">Services</Link></li>
              <li><Link href="/about" className="hover:text-brand-gold transition-colors">À propos</Link></li>
              <li><Link href="/devis" className="hover:text-brand-gold transition-colors">Demander un devis</Link></li>
              <li><Link href="/contact" className="hover:text-brand-gold transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-3">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-brand-gold shrink-0" />
                <a href="mailto:cnlsourcingvn@gmail.com" className="hover:text-brand-gold transition-colors">
                  cnlsourcingvn@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-brand-gold shrink-0" />
                <span>Hô Chi Minh-Ville, Vietnam · France</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} CNL Sourcing. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
