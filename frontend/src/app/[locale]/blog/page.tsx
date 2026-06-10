import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getBlogPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Conseils sourcing Asie & Vietnam pour PME françaises",
  description:
    "Guides pratiques sur le sourcing en Asie, l'import depuis le Vietnam, les droits de douane EVFTA et le dropshipping Asie pour les e-commerçants et PME françaises.",
  keywords: [
    "blog sourcing Asie",
    "guide import Vietnam",
    "conseils sourcing PME",
    "dropshipping Asie guide",
    "EVFTA guide pratique",
    "grossiste Asie conseils",
  ],
  alternates: {
    canonical: "https://cnlsourcing.com/fr/blog",
    languages: {
      fr: "https://cnlsourcing.com/fr/blog",
      "x-default": "https://cnlsourcing.com/fr/blog",
    },
  },
  openGraph: {
    title: "Blog CNL Sourcing — Conseils import Asie & Vietnam",
    description:
      "Guides pratiques sur le sourcing en Asie, l'import Vietnam, l'EVFTA et le dropshipping pour PME françaises.",
    url: "https://cnlsourcing.com/fr/blog",
    images: [{ url: "https://cnlsourcing.com/api/og?title=Blog%20CNL%20Sourcing&subtitle=Conseils%20sourcing%20Asie%20%26%20Vietnam", width: 1200, height: 630, alt: "Blog CNL Sourcing" }],
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogPage({ params: { locale } }: { params: { locale: string } }) {
  const posts = getBlogPosts(locale === "fr" ? "fr" : "fr");
  const base = locale === "fr" ? "" : `/${locale}`;

  return (
    <>
      <Header />
      <main>
        <section className="bg-brand-dark text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              Blog — Conseils sourcing Asie
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Guides pratiques pour importer depuis le Vietnam et l'Asie : fournisseurs, douane, dropshipping, EVFTA.
            </p>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="space-y-8">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="card group hover:-translate-y-1 transition-transform duration-300"
              >
                <p className="text-sm text-gray-400 mb-2">{formatDate(post.date)}</p>
                <h2 className="font-serif text-2xl font-bold text-brand-dark mb-3 group-hover:text-brand-red transition-colors">
                  <Link href={`${base}/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="text-gray-500 leading-relaxed mb-4">{post.description}</p>
                <Link
                  href={`${base}/blog/${post.slug}`}
                  className="inline-flex items-center gap-2 text-brand-red font-medium text-sm hover:gap-3 transition-all"
                >
                  Lire l'article <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
