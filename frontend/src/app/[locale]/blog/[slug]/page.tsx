import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getTranslations } from "next-intl/server";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getBlogPost } from "@/lib/blog";

export const dynamic = "force-dynamic";

interface Props {
  params: { locale: string; slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getBlogPost(params.locale, params.slug);
  if (!post) return {};

  const base = params.locale === "fr" ? "" : `/${params.locale}`;

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: `https://cnlsourcing.com/fr/blog/${post.slug}`,
      languages: {
        fr: `https://cnlsourcing.com/fr/blog/${post.slug}`,
        "x-default": `https://cnlsourcing.com/fr/blog/${post.slug}`,
      },
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://cnlsourcing.com${base}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
      authors: ["Anna Nguyen"],
      images: [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(
    locale === "vi" ? "vi-VN" : locale === "en" ? "en-GB" : "fr-FR",
    { day: "numeric", month: "long", year: "numeric" }
  );
}

export default async function BlogPostPage({ params }: Props) {
  const [post, t] = await Promise.all([
    getBlogPost(params.locale, params.slug),
    getTranslations({ locale: params.locale, namespace: "blog_page" }),
  ]);

  if (!post) notFound();

  const base = params.locale === "fr" ? "" : `/${params.locale}`;
  const tNav = await getTranslations({ locale: params.locale, namespace: "nav" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    image: post.coverImage,
    author: {
      "@type": "Person",
      name: "Anna Nguyen",
      url: "https://cnlsourcing.com/fr/about",
    },
    publisher: {
      "@type": "Organization",
      name: "CNL Sourcing",
      url: "https://cnlsourcing.com",
      logo: "https://cnlsourcing.com/icons/icon-512.png",
    },
    mainEntityOfPage: `https://cnlsourcing.com/fr/blog/${post.slug}`,
    keywords: post.keywords.join(", "),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main>
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-16">
          <Link
            href={`${base}/blog`}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-brand-red text-sm mb-8 transition-colors"
          >
            <ArrowLeft size={16} /> {t("backToBlog")}
          </Link>

          {/* Image héro */}
          <div className="relative w-full h-56 md:h-72 rounded-2xl overflow-hidden mb-8 bg-brand-dark">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
              unoptimized
            />
          </div>

          <header className="mb-10">
            <p className="text-sm text-gray-400 mb-3">
              {formatDate(post.date, params.locale)}
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-brand-dark leading-tight mb-4">
              {post.title}
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed">
              {post.description}
            </p>
          </header>

          <div className="prose prose-lg prose-headings:font-serif prose-headings:text-brand-dark prose-a:text-brand-red prose-strong:text-brand-dark prose-table:text-sm max-w-none">
            <MDXRemote source={post.content} />
          </div>

          <footer className="mt-12 pt-8 border-t border-gray-100">
            <div className="bg-brand-light rounded-2xl p-6 text-center">
              <p className="font-serif text-xl font-bold text-brand-dark mb-2">
                {t("ctaTitle")}
              </p>
              <p className="text-gray-500 mb-4 text-sm">{t("ctaDesc")}</p>
              <Link
                href={`${base}/devis`}
                className="btn-primary text-sm py-2 px-6"
              >
                {tNav("devis")}
              </Link>
            </div>
          </footer>
        </article>
      </main>
      <Footer />
    </>
  );
}
