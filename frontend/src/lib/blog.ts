import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { query } from "@/lib/db/client";

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

// ─── MDX (fichiers statiques) ─────────────────────────────────────────────────

export function getBlogPostsMdx(locale: string): BlogPostMeta[] {
  const dir = path.join(contentDir, locale);
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

export function getBlogPostMdx(locale: string, slug: string): BlogPost | null {
  const dir = path.join(contentDir, locale);
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

export async function getBlogPostDb(slug: string): Promise<BlogPost | null> {
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

// ─── Fonctions publiques (merge MDX + DB) ────────────────────────────────────

export async function getBlogPosts(locale: string): Promise<BlogPostMeta[]> {
  const [mdx, db] = await Promise.all([
    getBlogPostsMdx(locale),
    getBlogPostsDb(),
  ]);

  // Déduplique par slug (MDX a priorité)
  const slugsSeen = new Set(mdx.map((p) => p.slug));
  const dbUnique = db.filter((p) => !slugsSeen.has(p.slug));

  return [...mdx, ...dbUnique].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getBlogPost(
  locale: string,
  slug: string
): Promise<BlogPost | null> {
  const mdx = getBlogPostMdx(locale, slug);
  if (mdx) return mdx;
  return getBlogPostDb(slug);
}

export function getAllBlogSlugs(locale: string): string[] {
  return getBlogPostsMdx(locale).map((p) => p.slug);
}
