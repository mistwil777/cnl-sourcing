"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import LocaleSwitcher from "./LocaleSwitcher";

export default function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const base = locale === "fr" ? "" : `/${locale}`;

  const links = [
    { href: `${base}/`, label: t("home") },
    { href: `${base}/services`, label: t("services") },
    { href: `${base}/about`, label: t("about") },
    { href: `${base}/contact`, label: t("contact") },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`${base}/`} className="flex items-center">
            <img
              src="/images/logo-cnl.png"
              alt="CNL Sourcing"
              className="h-10 w-auto"
            />
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-brand-red ${
                  pathname === link.href ? "text-brand-red" : "text-gray-600"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA + langue */}
          <div className="hidden md:flex items-center gap-3">
            <LocaleSwitcher />
            <Link href={`${base}/devis`} className="btn-primary text-sm py-2">
              {t("devis")}
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-4">
          <nav className="flex flex-col gap-3 pt-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 font-medium py-2 border-b border-gray-50"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <LocaleSwitcher />
            <Link href={`${base}/devis`} className="btn-primary justify-center mt-2" onClick={() => setMobileOpen(false)}>
              {t("devis")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
