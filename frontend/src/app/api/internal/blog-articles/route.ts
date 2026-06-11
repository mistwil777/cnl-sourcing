/**
 * POST /api/internal/blog-articles
 * Sauvegarde un article de blog généré (appelé par le workflow n8n WF-BLOG)
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";

const INTERNAL_TOKEN = process.env.N8N_INTERNAL_TOKEN ?? "cnl-internal-2026";

function slugify(titre: string): string {
  return titre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  if (req.headers.get("x-internal-token") !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.titre || !body?.contenu || !body?.description) {
    return NextResponse.json(
      { error: "titre, description et contenu requis" },
      { status: 400 }
    );
  }

  const slug =
    body.slug?.trim() ||
    slugify(body.titre) + "-" + new Date().getFullYear();

  const coverImage =
    body.cover_image ??
    `https://cnlsourcing.com/api/og?title=${encodeURIComponent(body.titre)}`;

  const rows = await query<{ id: string }>(
    `INSERT INTO blog_articles
       (slug, titre, description, contenu, keywords, cover_image, tokens_utilises, modele_utilise, statut)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'en_attente_approbation')
     RETURNING id`,
    [
      slug,
      body.titre,
      body.description,
      body.contenu,
      body.keywords ? `{${(body.keywords as string[]).map((k) => `"${k}"`).join(",")}}` : "{}",
      coverImage,
      body.tokens_utilises ?? 0,
      body.modele_utilise ?? "claude-sonnet-4-6",
    ]
  );

  return NextResponse.json({ id: rows[0].id, slug });
}
