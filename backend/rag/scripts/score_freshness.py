#!/usr/bin/env python3
"""
score_freshness.py — Calcule et met à jour le score de fraîcheur des articles dynamiques.

Le facteur de fraîcheur est appliqué lors de la recherche RAG :
    score_final = score_pertinence × facteur_recence

Facteur de récence (décroissance exponentielle) :
    facteur = exp(-λ × jours_depuis_publication)
    λ = ln(2) / half_life_days  (half_life = 22 jours par défaut)

Usage:
    python score_freshness.py             # met à jour tous les articles
    python score_freshness.py --preview   # affiche les scores sans mise à jour
"""

import argparse
import json
import logging
import math
import os
from datetime import datetime, timezone
from pathlib import Path

import psycopg2

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("score_freshness")

ROOT        = Path(__file__).resolve().parents[2]
SOURCES_FILE = ROOT / "rag" / "sources" / "rss_sources.json"

# Lecture config
config        = json.loads(SOURCES_FILE.read_text())["config"]
FRESHNESS_DAYS = config.get("freshness_days", 45)   # articles > N jours = score 0
HALF_LIFE_DAYS = FRESHNESS_DAYS / 2                  # demi-vie : score divisé par 2

def freshness_factor(date_pub: datetime, now: datetime = None) -> float:
    """Facteur de fraîcheur entre 0.0 et 1.0."""
    if now is None:
        now = datetime.now(timezone.utc)
    if date_pub is None:
        return 0.5  # pas de date = score neutre
    if date_pub.tzinfo is None:
        date_pub = date_pub.replace(tzinfo=timezone.utc)
    days = (now - date_pub).total_seconds() / 86400
    if days > FRESHNESS_DAYS:
        return 0.0
    lam = math.log(2) / HALF_LIFE_DAYS
    return round(math.exp(-lam * days), 4)

def get_db():
    return psycopg2.connect(
        host=os.environ.get("POSTGRES_HOST", "localhost"),
        port=int(os.environ.get("POSTGRES_PORT", 5432)),
        dbname=os.environ.get("POSTGRES_DB", "cnlsourcing"),
        user=os.environ.get("POSTGRES_USER", ""),
        password=os.environ.get("POSTGRES_PASSWORD", ""),
    )

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", action="store_true")
    args = parser.parse_args()

    try:
        conn = get_db()
    except Exception as e:
        log.error(f"PostgreSQL indisponible: {e}")
        return

    now = datetime.now(timezone.utc)
    updated = 0
    expired = 0

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, titre, date_publication, score_pertinence FROM veille_articles WHERE statut='publié'"
        )
        rows = cur.fetchall()

    log.info(f"{len(rows)} articles à traiter (half-life={HALF_LIFE_DAYS:.0f}j, max={FRESHNESS_DAYS}j)")

    for row_id, titre, date_pub, score_base in rows:
        factor  = freshness_factor(date_pub, now)
        score_f = round((score_base or 0.5) * factor, 4)

        if args.preview:
            days = (now - date_pub.replace(tzinfo=timezone.utc)).days if date_pub else "?"
            print(f"  [{factor:.2f}×{score_base:.2f}={score_f:.2f}] {str(days):>4}j — {titre[:60]}")
            continue

        if factor == 0.0:
            # Archive les articles trop anciens
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE veille_articles SET statut='archivé' WHERE id=%s", (row_id,)
                )
            expired += 1
        else:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE veille_articles SET score_fraicheur=%s WHERE id=%s",
                    (score_f, row_id),
                )
            updated += 1

    if not args.preview:
        conn.commit()
        log.info(f"Mis à jour: {updated} | Archivés: {expired}")

    conn.close()

if __name__ == "__main__":
    main()
