#!/usr/bin/env python3
"""
collect_rss.py — Collecte et indexation des sources RSS/scraping pour CNL Sourcing RAG.

Usage:
    python collect_rss.py                              # collecte toutes les sources actives
    python collect_rss.py --test --sources vir,just_style  # test sur sources spécifiques
    python collect_rss.py --sources ccifv,douanes_fr   # sources spécifiques seulement
"""

import argparse
import hashlib
import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import anthropic
import feedparser
import psycopg2
import requests
from bs4 import BeautifulSoup

# ─── Configuration ────────────────────────────────────────────────────────────
ROOT          = Path(__file__).resolve().parents[2]
SOURCES_FILE  = ROOT / "rag" / "sources" / "rss_sources.json"
DYNAMIC_DIR   = ROOT / "rag" / "documents" / "dynamic"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("collect_rss")

# ─── Clients ─────────────────────────────────────────────────────────────────
anthropic_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

SCORE_PROMPT = """Tu es un expert en sourcing Vietnam et commerce franco-vietnamien.
Évalue la pertinence de l'article ci-dessous pour une base de connaissance RAG
destinée à une agente de sourcing Vietnam/France (textile, alimentation, artisanat,
douanes, EVFTA, logistique, fournisseurs).

Réponds UNIQUEMENT avec un JSON : {"score": 0.0, "raison": "..."}
Le score est entre 0.0 (non pertinent) et 1.0 (très pertinent).

Article :
Titre : {titre}
Résumé : {resume}
"""

# ─── Base de données ──────────────────────────────────────────────────────────
def get_db():
    return psycopg2.connect(
        host=os.environ.get("POSTGRES_HOST", "localhost"),
        port=int(os.environ.get("POSTGRES_PORT", 5432)),
        dbname=os.environ.get("POSTGRES_DB", "cnlsourcing"),
        user=os.environ.get("POSTGRES_USER", ""),
        password=os.environ.get("POSTGRES_PASSWORD", ""),
    )

def hash_exists(conn, content_hash: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM veille_articles WHERE hash_contenu = %s LIMIT 1",
            (content_hash,),
        )
        return cur.fetchone() is not None

def insert_article(conn, article: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO veille_articles
               (titre, url, source_id, langue, contenu_resume, contenu_complet,
                score_pertinence, hash_contenu, date_publication, secteurs, statut)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'publié')
               ON CONFLICT (hash_contenu) DO NOTHING""",
            (
                article["titre"],
                article["url"],
                article["source_id"],
                article["langue"],
                article["resume"],
                article.get("contenu", ""),
                article["score"],
                article["hash"],
                article.get("date_pub"),
                json.dumps(article.get("secteurs", [])),
            ),
        )
    conn.commit()

def log_workflow(conn, source_id: str, statut: str, stats: dict, erreur: str = "") -> None:
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO logs_workflows
               (workflow_nom, statut, donnees_sortie, erreur_message)
               VALUES (%s,%s,%s,%s)""",
            (
                f"collect_rss:{source_id}",
                statut,
                json.dumps(stats),
                erreur,
            ),
        )
    conn.commit()

# ─── Utilitaires ─────────────────────────────────────────────────────────────
def clean_html(raw: str) -> str:
    """Supprime les balises HTML et normalise le texte."""
    text = BeautifulSoup(raw or "", "html.parser").get_text(separator=" ")
    text = re.sub(r"\s+", " ", text).strip()
    return text[:2000]  # limite résumé

def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

OLLAMA_URL    = os.environ.get("OLLAMA_URL", "http://ollama:11434")
OLLAMA_MODEL  = os.environ.get("OLLAMA_SCORING_MODEL", "phi3:mini")

def score_article(titre: str, resume: str) -> tuple[float, str]:
    """
    Scoring de pertinence avec fallback en cascade :
    1. Ollama local (gratuit, phi3:mini)
    2. Claude Haiku (si Ollama indisponible et clé API présente)
    3. Mots-clés (fallback ultime)
    """
    # --- Ollama (gratuit, modèle local) ---
    try:
        ollama_prompt = (
            f"Rate this article's relevance to Vietnam-France trade, sourcing from Vietnam, "
            f"Vietnamese suppliers, customs/EVFTA regulations, or Vietnam economic news.\n"
            f"Reply with ONLY a decimal number between 0 and 1. Nothing else.\n\n"
            f"Title: {titre[:200]}\nSummary: {resume[:300]}\n\nScore:"
        )
        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": ollama_prompt, "stream": False,
                  "options": {"temperature": 0, "num_predict": 5}},
            timeout=15,
        )
        if resp.ok:
            raw = resp.json().get("response", "").strip()
            score = float(re.search(r'\d+\.?\d*', raw).group())
            return max(0.0, min(1.0, score)), f"ollama/{OLLAMA_MODEL}"
    except Exception:
        pass  # Ollama indisponible — essaye Haiku

    # --- Claude Haiku (si clé API disponible) ---
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if api_key:
        try:
            msg = anthropic_client.messages.create(
                model=os.environ.get("ANTHROPIC_MODEL_FAST", "claude-haiku-4-5-20251001"),
                max_tokens=100,
                messages=[{"role": "user",
                           "content": SCORE_PROMPT.format(titre=titre[:200], resume=resume[:500])}],
            )
            raw = msg.content[0].text.strip()
            match = re.search(r'\{.*\}', raw, re.DOTALL)
            if match:
                data = json.loads(match.group())
                return float(data.get("score", 0)), data.get("raison", "claude-haiku")
        except Exception as e:
            log.warning(f"Claude Haiku score error: {e}")

    # --- Fallback : mots-clés ---
    keywords_high = ["vietnam", "vietnamien", "viet nam", "hanoi", "ho chi minh", "evfta"]
    keywords_med  = ["sourcing", "fournisseur", "supplier", "import", "export", "douane", "asean"]
    keywords_low  = ["commerce", "trade", "manufacturing", "supply chain", "textile", "garment"]
    text = (titre + " " + resume).lower()
    score = sum(0.20 for kw in keywords_high if kw in text) + \
            sum(0.12 for kw in keywords_med  if kw in text) + \
            sum(0.07 for kw in keywords_low  if kw in text)
    hits = sum(1 for kw in keywords_high + keywords_med + keywords_low if kw in text)
    return min(1.0, score), f"mots-cles ({hits} hits)"

# ─── Collecte RSS ─────────────────────────────────────────────────────────────
def collect_rss(source: dict, test_mode: bool = False) -> list[dict]:
    articles = []
    try:
        feed = feedparser.parse(source["url"])
        entries = feed.entries[:5] if test_mode else feed.entries[:source.get("max", 20)]
        for entry in entries:
            titre  = entry.get("title", "").strip()
            url    = entry.get("link", "").strip()
            resume = clean_html(
                entry.get("summary", "") or entry.get("description", "")
            )
            date_pub = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                date_pub = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)

            if not titre or not url:
                continue

            articles.append({
                "titre":     titre,
                "url":       url,
                "resume":    resume,
                "date_pub":  date_pub,
                "source_id": source["id"],
                "langue":    source["langue"],
                "secteurs":  source["secteurs"],
            })
    except Exception as e:
        log.error(f"[{source['id']}] RSS parse error: {e}")
    return articles

# ─── Collecte Scraping ────────────────────────────────────────────────────────
def collect_scraping(source: dict, test_mode: bool = False) -> list[dict]:
    articles = []
    try:
        resp = requests.get(source["url"], timeout=15, headers={
            "User-Agent": "CNL-Sourcing-Bot/1.0 (sourcing agent, contact: cnlsourcingvn@gmail.com)"
        })
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Stratégie générique : cherche les balises article/h2/h3 avec lien
        candidates = []
        for tag in soup.find_all(["article", "div"], class_=re.compile(r"(article|post|news|actualit)", re.I)):
            a = tag.find("a", href=True)
            heading = tag.find(["h2", "h3", "h4"])
            if a and heading:
                titre = heading.get_text(strip=True)
                url   = a["href"]
                if not url.startswith("http"):
                    from urllib.parse import urljoin
                    url = urljoin(source["url"], url)
                resume = clean_html(tag.get_text())
                candidates.append({
                    "titre":     titre,
                    "url":       url,
                    "resume":    resume,
                    "source_id": source["id"],
                    "langue":    source["langue"],
                    "secteurs":  source["secteurs"],
                    "date_pub":  None,
                })

        limit = 5 if test_mode else 20
        articles = candidates[:limit]
    except Exception as e:
        log.error(f"[{source['id']}] Scraping error: {e}")
    return articles

# ─── Pipeline principal ────────────────────────────────────────────────────────
def process_source(source: dict, conn, config: dict, test_mode: bool) -> dict:
    stats = {"collectes": 0, "retenus": 0, "rejetes": 0, "doublons": 0, "exemples": []}

    log.info(f"[{source['id']}] Collecte ({source['type']})...")

    if source["type"] == "rss":
        articles = collect_rss(source, test_mode)
    else:
        articles = collect_scraping(source, test_mode)

    stats["collectes"] = len(articles)

    for art in articles:
        content_hash = sha256(art["url"] + art["titre"])
        art["hash"] = content_hash

        # Dédoublonnage
        if not test_mode and hash_exists(conn, content_hash):
            stats["doublons"] += 1
            continue

        # Scoring
        score, raison = score_article(art["titre"], art["resume"])
        art["score"] = score

        if score >= config["score_threshold"]:
            stats["retenus"] += 1
            log.info(f"  ✓ [{score:.2f}] {art['titre'][:70]}")

            if not test_mode:
                try:
                    insert_article(conn, art)
                    # Sauvegarder aussi en fichier local (couche dynamic)
                    safe_name = re.sub(r"[^\w]", "_", art["titre"])[:50]
                    out_file = DYNAMIC_DIR / f"{source['id']}_{safe_name}.md"
                    out_file.write_text(
                        f"# {art['titre']}\n\n"
                        f"Source: {source['nom']}  \n"
                        f"URL: {art['url']}  \n"
                        f"Date: {art.get('date_pub', 'N/A')}  \n"
                        f"Score: {score:.2f}  \n\n"
                        f"{art['resume']}",
                        encoding="utf-8",
                    )
                except Exception as e:
                    log.error(f"  Insert error: {e}")

            if len(stats["exemples"]) < 2:
                stats["exemples"].append({
                    "titre": art["titre"],
                    "score": score,
                    "raison": raison,
                    "url": art["url"],
                })
        else:
            stats["rejetes"] += 1
            log.debug(f"  ✗ [{score:.2f}] {art['titre'][:70]} — {raison}")

    return stats

# ─── Entrée principale ────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Collecte RSS/scraping pour CNL Sourcing RAG")
    parser.add_argument("--test",    action="store_true", help="Mode test (pas d'insertion DB)")
    parser.add_argument("--sources", type=str, default="", help="IDs sources séparés par virgule")
    args = parser.parse_args()

    sources_data = json.loads(SOURCES_FILE.read_text(encoding="utf-8"))
    config       = sources_data["config"]
    all_sources  = sources_data["sources"]

    # Filtre selon --sources
    if args.sources:
        ids = [s.strip() for s in args.sources.split(",")]
        sources = [s for s in all_sources if s["id"] in ids and s["actif"]]
    else:
        sources = [s for s in all_sources if s["actif"]]

    if not sources:
        log.error("Aucune source trouvée.")
        sys.exit(1)

    log.info(f"{'[TEST] ' if args.test else ''}Collecte sur {len(sources)} source(s)...")

    # Connexion DB (optionnelle en mode test)
    conn = None
    if not args.test:
        try:
            conn = get_db()
        except Exception as e:
            log.warning(f"DB indisponible ({e}) — mode sans insertion activé")
            args.test = True

    total = {"collectes": 0, "retenus": 0, "rejetes": 0, "doublons": 0}

    for source in sources:
        try:
            stats = process_source(source, conn, config, args.test)

            for k in total:
                total[k] += stats.get(k, 0)

            print("\n" + "-"*60)
            print(f"Source : {source['nom']} [{source['id']}]")
            print(f"  Collectes : {stats['collectes']}")
            print(f"  Retenus   : {stats['retenus']}  (score >= {config['score_threshold']})")
            print(f"  Rejetes   : {stats['rejetes']}")
            if not args.test:
                print(f"  Doublons  : {stats['doublons']}")
            if stats.get("exemples"):
                print("  Exemple retenu :")
                ex = stats["exemples"][0]
                print(f"    [{ex['score']:.2f}] {ex['titre']}")
                print(f"    {ex['url']}")
                print(f"    Raison : {ex['raison']}")

            if conn and not args.test:
                log_workflow(conn, source["id"], "succes", stats)

        except Exception as e:
            log.error(f"[{source['id']}] Erreur: {e}")
            if conn and not args.test:
                log_workflow(conn, source["id"], "erreur", {}, str(e))

    print("\n" + "="*60)
    print(f"TOTAL -- {len(sources)} source(s)")
    print(f"  Collectes : {total['collectes']}")
    print(f"  Retenus   : {total['retenus']}")
    print(f"  Rejetes   : {total['rejetes']}")
    if not args.test:
        print(f"  Doublons  : {total['doublons']}")

    if conn:
        conn.close()

if __name__ == "__main__":
    main()
