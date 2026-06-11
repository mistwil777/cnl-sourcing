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

  const mainLinks = [
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
          <Link href={`${base}/`} className="flex items-center gap-2">
            <span className="font-serif text-2xl font-bold text-brand-red">CNL</span>
            <span className="font-serif text-2xl font-bold text-brand-dark">Sourcing</span>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-6">
            {mainLinks.map((link) => (
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
            {/* Blog — séparé visuellement */}
            <span className="text-gray-200 select-none">|</span>
            <Link
              href={`${base}/blog`}
              className={`text-sm font-medium transition-colors hover:text-brand-red flex items-center gap-1 ${
                pathname.startsWith(`${base}/blog`) ? "text-brand-red" : "text-gray-500"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              {t("blog")}
            </Link>
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
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 font-medium py-2 border-b border-gray-50"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={`${base}/blog`}
              className="text-gray-500 font-medium py-2 border-b border-gray-50 flex items-center gap-2 pl-4"
              onClick={() => setMobileOpen(false)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              {t("blog")}
            </Link>
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
