import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  keywords: string[];
  content: string;
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  keywords: string[];
}

const contentDir = path.join(process.cwd(), "content", "blog");

export function getBlogPosts(locale: string): BlogPostMeta[] {
  const dir = path.join(contentDir, locale);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));

  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data } = matter(raw);
      return {
        slug: data.slug as string,
        title: data.title as string,
        description: data.description as string,
        date: data.date as string,
        keywords: (data.keywords as string[]) ?? [],
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getBlogPost(locale: string, slug: string): BlogPost | null {
  const dir = path.join(contentDir, locale);
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  const file = files.find((f) => {
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
    content,
  };
}

export function getAllBlogSlugs(locale: string): string[] {
  return getBlogPosts(locale).map((p) => p.slug);
}
