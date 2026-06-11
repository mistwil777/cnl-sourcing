import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { query } from "@/lib/db/client";
import { getTranslatedPost } from "@/lib/blog-translate";

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  keywords: string[];
  coverImage: string;
  source: "mdx" | "db";
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}

const contentDir = path.join(process.cwd(), "content", "blog");

function ogUrl(title: string): string {
  return `https://cnlsourcing.com/api/og?title=${encodeURIComponent(title)}`;
}

// ─── MDX (fichiers statiques, toujours en FR) ─────────────────────────────────

export function getBlogPostsMdx(locale: string): BlogPostMeta[] {
  // Les fichiers MDX sont uniquement en FR — on lit toujours depuis /fr/
  const dir = path.join(contentDir, "fr");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data } = matter(raw);
      return {
        slug: data.slug as string,
        title: data.title as string,
        description: data.description as string,
        date: data.date as string,
        keywords: (data.keywords as string[]) ?? [],
        coverImage: (data.coverImage as string) ?? ogUrl(data.title as string),
        source: "mdx" as const,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getBlogPostMdxFr(slug: string): BlogPost | null {
  const dir = path.join(contentDir, "fr");
  if (!fs.existsSync(dir)) return null;

  const file = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .find((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf-8");
      const { data } = matter(raw);
      return data.slug === slug;
    });

  if (!file) return null;

  const raw = fs.readFileSync(path.join(dir, file), "utf-8");
  const { data, content } = matter(raw);

  return {
    slug: data.slug as string,
    title: data.title as string,
    description: data.description as string,
    date: data.date as string,
    keywords: (data.keywords as string[]) ?? [],
    coverImage: (data.coverImage as string) ?? ogUrl(data.title as string),
    source: "mdx",
    content,
  };
}

// ─── DB (articles générés par IA, validés par Anna) ──────────────────────────

export async function getBlogPostsDb(): Promise<BlogPostMeta[]> {
  try {
    const rows = await query<{
      slug: string;
      titre: string;
      description: string;
      date_publication: string;
      keywords: string[];
      cover_image: string | null;
    }>(
      `SELECT slug, titre, description,
              COALESCE(date_publication::text, publie_le::date::text) AS date_publication,
              keywords, cover_image
       FROM blog_articles
       WHERE statut = 'publie'
       ORDER BY publie_le DESC`
    );

    return rows.map((r) => ({
      slug: r.slug,
      title: r.titre,
      description: r.description,
      date: r.date_publication ?? new Date().toISOString().slice(0, 10),
      keywords: r.keywords ?? [],
      coverImage: r.cover_image ?? ogUrl(r.titre),
      source: "db" as const,
    }));
  } catch {
    return [];
  }
}

export async function getBlogPostDbFr(slug: string): Promise<BlogPost | null> {
  try {
    const rows = await query<{
      slug: string;
      titre: string;
      description: string;
      contenu: string;
      date_publication: string;
      keywords: string[];
      cover_image: string | null;
    }>(
      `SELECT slug, titre, description, contenu,
              COALESCE(date_publication::text, publie_le::date::text) AS date_publication,
              keywords, cover_image
       FROM blog_articles
       WHERE slug = $1 AND statut = 'publie'
       LIMIT 1`,
      [slug]
    );

    if (rows.length === 0) return null;
    const r = rows[0];

    return {
      slug: r.slug,
      title: r.titre,
      description: r.description,
      date: r.date_publication ?? new Date().toISOString().slice(0, 10),
      keywords: r.keywords ?? [],
      coverImage: r.cover_image ?? ogUrl(r.titre),
      source: "db",
      content: r.contenu,
    };
  } catch {
    return null;
  }
}

// ─── Fonctions publiques ──────────────────────────────────────────────────────

/**
 * Liste des articles pour la page listing.
 * Pour EN/VI : titre + description traduits si déjà en cache Redis, sinon FR (fallback).
 * La traduction complète est déclenchée à l'ouverture de l'article.
 */
export async function getBlogPosts(locale: string): Promise<BlogPostMeta[]> {
  const [mdxFr, db] = await Promise.all([
    getBlogPostsMdx("fr"),
    getBlogPostsDb(),
  ]);

  // Déduplique par slug (MDX prioritaire)
  const slugsSeen = new Set(mdxFr.map((p) => p.slug));
  const dbUnique = db.filter((p) => !slugsSeen.has(p.slug));
  const allFr: BlogPostMeta[] = [...mdxFr, ...dbUnique].sort(
    (a, b) => (a.date < b.date ? 1 : -1)
  );

  if (locale === "fr") return allFr;

  // EN/VI — tente de récupérer les titres/descriptions depuis le cache Redis
  // (sans déclencher de nouvelles traductions pour la liste)
  const { getCachedTranslation } = await import("@/lib/blog-translate");
  const translated = await Promise.all(
    allFr.map(async (post) => {
      const cached = await getCachedTranslation(locale, post.slug);
      if (cached) {
        return { ...post, title: cached.title, description: cached.description };
      }
      return post; // fallback FR si pas encore en cache
    })
  );

  return translated;
}

/**
 * Article complet. Pour EN/VI : traduit via Claude Haiku (cache Redis 30j).
 * Première visite ~2s, suivantes instantanées.
 */
export async function getBlogPost(
  locale: string,
  slug: string
): Promise<BlogPost | null> {
  // Récupère toujours la version FR comme source
  const frPost =
    getBlogPostMdxFr(slug) ?? (await getBlogPostDbFr(slug));

  if (!frPost) return null;

  // FR → retour direct
  if (locale === "fr") return frPost;

  // EN / VI → traduction (cache Redis ou Claude Haiku)
  const translated = await getTranslatedPost(
    locale,
    slug,
    frPost.title,
    frPost.description,
    frPost.content
  );

  if (!translated) return frPost; // fallback FR si erreur

  return {
    ...frPost,
    title: translated.title,
    description: translated.description,
    content: translated.content,
  };
}

export function getAllBlogSlugs(locale: string): string[] {
  return getBlogPostsMdx(locale).map((p) => p.slug);
}
