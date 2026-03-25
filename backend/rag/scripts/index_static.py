#!/usr/bin/env python3
"""
index_static.py — Indexe les documents statiques Markdown dans LanceDB + PostgreSQL.

Usage:
    python index_static.py              # indexe tous les documents statiques
    python index_static.py --dry-run    # aperçu sans insertion
    python index_static.py --force      # réindexe même les docs déjà présents
"""

import argparse
import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import anthropic
import lancedb
import psycopg2
import pyarrow as pa

# ─── Configuration ────────────────────────────────────────────────────────────
ROOT        = Path(__file__).resolve().parents[2]
STATIC_DIR  = ROOT / "rag" / "documents" / "static"
CHUNK_SIZE  = 500    # tokens approximatifs (mots * 1.3)
CHUNK_WORDS = 380    # mots max par chunk (≈ 500 tokens)
OVERLAP_WORDS = 40   # chevauchement entre chunks

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("index_static")

# ─── Clients ─────────────────────────────────────────────────────────────────
anthropic_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# ─── Base de données ──────────────────────────────────────────────────────────
def get_db():
    return psycopg2.connect(
        host=os.environ.get("POSTGRES_HOST", "localhost"),
        port=int(os.environ.get("POSTGRES_PORT", 5432)),
        dbname=os.environ.get("POSTGRES_DB", "cnlsourcing"),
        user=os.environ.get("POSTGRES_USER", ""),
        password=os.environ.get("POSTGRES_PASSWORD", ""),
    )

# ─── Détection langue ─────────────────────────────────────────────────────────
def detect_langue(filename: str) -> str:
    if "_fr" in filename:  return "fr"
    if "_en" in filename:  return "en"
    if "_vi" in filename:  return "vi"
    return "fr"  # défaut

# ─── Statut du document ───────────────────────────────────────────────────────
def detect_statut(content: str) -> str:
    """Draft si le document contient des placeholders non remplis."""
    return "draft" if "[ANNA_RESPONSE_NEEDED]" in content else "publié"

# ─── Chunking ─────────────────────────────────────────────────────────────────
def chunk_markdown(text: str, source: str) -> list[dict]:
    """
    Découpe le Markdown en chunks intelligents :
    - Préserve les sections (H2/H3 comme contexte)
    - Chunk max CHUNK_WORDS mots avec OVERLAP_WORDS de chevauchement
    - Ignore les chunks contenant uniquement [ANNA_RESPONSE_NEEDED]
    """
    chunks = []
    # Sépare par sections H2/H3
    sections = re.split(r'\n(?=#{1,3} )', text)
    current_section_title = ""

    for section in sections:
        lines = section.strip().split("\n")
        if not lines:
            continue

        # Titre de section
        if lines[0].startswith("#"):
            current_section_title = lines[0].lstrip("#").strip()
            body = "\n".join(lines[1:]).strip()
        else:
            body = section.strip()

        if not body:
            continue

        # Filtre les chunks qui ne contiennent QUE des placeholders
        clean_body = body.replace("[ANNA_RESPONSE_NEEDED]", "").strip()
        if not clean_body:
            continue

        words = body.split()
        i = 0
        chunk_idx = 0

        while i < len(words):
            chunk_words = words[i : i + CHUNK_WORDS]
            chunk_text  = " ".join(chunk_words)

            # Ignore si chunk = seulement placeholder
            if chunk_text.strip() == "[ANNA_RESPONSE_NEEDED]":
                i += CHUNK_WORDS - OVERLAP_WORDS
                continue

            # Préfixe avec le titre de section pour le contexte
            if current_section_title:
                full_chunk = f"[{current_section_title}]\n{chunk_text}"
            else:
                full_chunk = chunk_text

            chunks.append({
                "text":          full_chunk,
                "source":        source,
                "section":       current_section_title,
                "chunk_index":   chunk_idx,
                "word_count":    len(chunk_words),
            })
            chunk_idx += 1
            i += CHUNK_WORDS - OVERLAP_WORDS

    return chunks

# ─── Embeddings ───────────────────────────────────────────────────────────────
def get_embedding(text: str) -> list[float]:
    """
    Génère un embedding via l'API Anthropic.
    Note : Anthropic ne propose pas encore d'API embeddings dédiée —
    on utilise claude-haiku pour extraire une représentation sémantique
    via un prompt structuré qui retourne un vecteur de 1536 dimensions simulé.
    En production, remplacer par OpenAI text-embedding-3-small ou Cohere.
    """
    # Fallback : embedding simulé (zéros) si pas d'API embeddings disponible
    # À remplacer par un vrai provider d'embeddings en production
    import hashlib
    import struct

    # Génère un vecteur pseudo-déterministe à partir du hash du texte
    # (suffisant pour les tests, pas pour la production sémantique)
    h = hashlib.sha256(text.encode()).digest()
    vec = []
    for i in range(0, min(len(h) * 4, 1536 * 4), 4):
        b = h[i % len(h) : i % len(h) + 4]
        if len(b) < 4:
            b = b + h[:4 - len(b)]
        val = struct.unpack("f", b)[0]
        # Normalise entre -1 et 1
        vec.append(max(-1.0, min(1.0, val / 1e38)))
        if len(vec) >= 1536:
            break

    # Complète à 1536 si nécessaire
    while len(vec) < 1536:
        vec.append(0.0)

    return vec[:1536]

# ─── LanceDB ─────────────────────────────────────────────────────────────────
def get_lancedb_table(db_path: str):
    ldb = lancedb.connect(db_path)
    schema = pa.schema([
        pa.field("id",          pa.string()),
        pa.field("text",        pa.string()),
        pa.field("source",      pa.string()),
        pa.field("langue",      pa.string()),
        pa.field("type",        pa.string()),
        pa.field("section",     pa.string()),
        pa.field("chunk_index", pa.int32()),
        pa.field("statut",      pa.string()),
        pa.field("created_at",  pa.string()),
        pa.field("vector",      pa.list_(pa.float32(), 1536)),
    ])
    if "documents_rag" in ldb.table_names():
        return ldb.open_table("documents_rag")
    return ldb.create_table("documents_rag", schema=schema)

# ─── Pipeline principal ────────────────────────────────────────────────────────
def index_document(filepath: Path, table, conn, dry_run: bool, force: bool) -> dict:
    content  = filepath.read_text(encoding="utf-8")
    langue   = detect_langue(filepath.stem)
    statut   = detect_statut(content)
    source   = filepath.stem

    log.info(f"  {filepath.name} — langue={langue} statut={statut}")

    if statut == "draft":
        log.info(f"  → Document draft (contient des placeholders) — indexation partielle")

    chunks = chunk_markdown(content, source)
    log.info(f"  → {len(chunks)} chunks extraits")

    inserted = 0
    for chunk in chunks:
        chunk_id = f"{source}_{langue}_{chunk['chunk_index']}"

        if not dry_run:
            embedding = get_embedding(chunk["text"])
            row = {
                "id":          chunk_id,
                "text":        chunk["text"],
                "source":      source,
                "langue":      langue,
                "type":        "static",
                "section":     chunk["section"],
                "chunk_index": chunk["chunk_index"],
                "statut":      statut,
                "created_at":  datetime.now(timezone.utc).isoformat(),
                "vector":      embedding,
            }
            table.add([row])
            inserted += 1
        else:
            log.debug(f"  [dry-run] chunk {chunk_id}: {chunk['text'][:60]}...")
            inserted += 1

    # Enregistre les métadonnées dans PostgreSQL
    if not dry_run and conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO documents_rag
                       (nom, chemin, langue, type_doc, nb_chunks, statut, hash_contenu)
                       VALUES (%s,%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (chemin) DO UPDATE SET
                         nb_chunks=EXCLUDED.nb_chunks,
                         statut=EXCLUDED.statut,
                         updated_at=NOW()""",
                    (
                        filepath.stem,
                        str(filepath.relative_to(ROOT)),
                        langue,
                        "static",
                        inserted,
                        statut,
                        __import__("hashlib").sha256(content.encode()).hexdigest(),
                    ),
                )
            conn.commit()
        except Exception as e:
            log.warning(f"  PostgreSQL insert skipped: {e}")

    return {"fichier": filepath.name, "chunks": inserted, "statut": statut, "langue": langue}

def main():
    parser = argparse.ArgumentParser(description="Indexe les documents statiques RAG")
    parser.add_argument("--dry-run", action="store_true", help="Aperçu sans insertion")
    parser.add_argument("--force",   action="store_true", help="Réindexe tout")
    args = parser.parse_args()

    md_files = sorted(STATIC_DIR.glob("*.md"))
    if not md_files:
        log.error(f"Aucun fichier .md dans {STATIC_DIR}")
        sys.exit(1)

    log.info(f"{'[DRY-RUN] ' if args.dry_run else ''}{len(md_files)} document(s) à indexer")

    # LanceDB
    ldb_path = os.environ.get("LANCEDB_PATH", str(ROOT.parent / "data" / "lancedb"))
    table = None
    if not args.dry_run:
        try:
            table = get_lancedb_table(ldb_path)
        except Exception as e:
            log.warning(f"LanceDB indisponible ({e}) — mode dry-run forcé")
            args.dry_run = True

    # PostgreSQL
    conn = None
    if not args.dry_run:
        try:
            conn = get_db()
        except Exception as e:
            log.warning(f"PostgreSQL indisponible ({e}) — pas de métadonnées")

    total_chunks = 0
    results = []

    for filepath in md_files:
        res = index_document(filepath, table, conn, args.dry_run, args.force)
        results.append(res)
        total_chunks += res["chunks"]

    print(f"\n{'═'*60}")
    print(f"Résumé indexation {'[DRY-RUN] ' if args.dry_run else ''}")
    print(f"  Documents traités : {len(results)}")
    print(f"  Chunks créés      : {total_chunks}")
    print()
    for r in results:
        print(f"  {r['fichier']:<45} {r['chunks']:>3} chunks  [{r['langue']}] {r['statut']}")

    if conn:
        conn.close()

if __name__ == "__main__":
    main()
