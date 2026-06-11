import { MetadataRoute } from "next";
import { getBlogPostsMdx } from "@/lib/blog";

const baseUrl = "https://cnlsourcing.com";
const locales = ["fr", "en", "vi"] as const;

const pages: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "", changeFrequency: "weekly", priority: 1.0 },
  { path: "/services", changeFrequency: "monthly", priority: 0.9 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.85 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.8 },
  { path: "/devis", changeFrequency: "weekly", priority: 0.9 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const page of pages) {
      entries.push({
        url: `${baseUrl}/${locale}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: locale === "fr" ? page.priority : page.priority * 0.9,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${baseUrl}/${l}${page.path}`])
          ),
        },
      });
    }
  }

  // Articles de blog (FR uniquement pour l'instant)
  const posts = getBlogPostsMdx("fr");
  for (const post of posts) {
    entries.push({
      url: `${baseUrl}/fr/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: { fr: `${baseUrl}/fr/blog/${post.slug}` },
      },
    });
  }

  return entries;
}
