# CNL Sourcing — Plateforme intelligente de sourcing Vietnam / France

Site web professionnel pour **CNL Sourcing** (cnlsourcing.com), dirigé par Anna Nguyen.
Automatisation du sourcing fournisseurs Vietnam → France, chatbot IA multilingue, gestion devis/facturation, veille marché.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 14 (App Router, i18n fr/en/vi) |
| Backend / API | Next.js API Routes + Python scripts |
| IA | Claude Haiku 4.5 (rapide) · Claude Sonnet 4.6 (analyse) |
| Vector store | LanceDB |
| Orchestration | n8n (workflows automatisés) |
| Base de données | PostgreSQL 16 |
| Cache | Redis 7 |
| Reverse proxy | Nginx (HTTPS, rate limiting) |
| Déploiement | Docker Compose · Scaleway VPS |
| CI/CD | GitHub Actions |

---

## Démarrage rapide

### Prérequis
- Docker Desktop ≥ 4.x (avec WSL2 sur Windows)
- Git
- `gh` CLI (optionnel pour GitHub)

### Installation

```bash
# 1. Cloner le dépôt
git clone git@github.com:mistwil777/cnl-sourcing.git
cd cnl-sourcing

# 2. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env et remplir les valeurs (API keys, mots de passe…)

# 3. Lancer tous les services
docker compose up -d

# 4. Vérifier que tout tourne
docker compose ps
```

### Accès

| Service | URL locale |
|---|---|
| Site web | http://localhost:3000 |
| n8n (workflows) | http://localhost:5678 |
| PostgreSQL | localhost:5432 |
| LanceDB | http://localhost:8080 |
| Redis | localhost:6379 |

---

## Structure du projet

```
cnl-sourcing/
├── frontend/                  # Next.js 14
│   ├── src/
│   │   ├── app/[locale]/      # Pages i18n (fr/en/vi)
│   │   ├── components/
│   │   │   ├── ui/            # Composants génériques
│   │   │   ├── chatbot/       # Widget chatbot IA
│   │   │   ├── forms/         # Formulaires (devis, contact)
│   │   │   └── layout/        # Header, footer, nav
│   │   ├── lib/
│   │   │   ├── rag/           # Intégration LanceDB + embeddings
│   │   │   ├── db/            # Client PostgreSQL
│   │   │   └── utils/         # Helpers
│   │   └── messages/          # Traductions fr.json, en.json, vi.json
│   └── public/
├── backend/
│   ├── api/                   # Routes API supplémentaires
│   └── scripts/               # Scripts Python (indexation RAG, veille)
├── n8n/workflows/             # Workflows JSON n8n
├── database/
│   ├── migrations/            # SQL migrations (001_init_schema.sql…)
│   └── seeds/                 # Données initiales
├── nginx/
│   ├── nginx.conf             # Configuration reverse proxy + SSL
│   └── ssl/                   # Certificats (ignorés par git)
├── docs/
│   ├── architecture/          # Diagrammes, ADR
│   └── runbooks/              # Procédures opérationnelles
├── .github/workflows/         # CI/CD GitHub Actions
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Workflows n8n (phases)

### Phase 1 — MVP
- WF-01 : Réception et qualification demandes clients
- WF-02 : Analyse IA demande (Claude Sonnet)
- WF-03 : Génération devis automatique
- WF-04 : Relances paiements automatiques
- WF-05 : Notifications WhatsApp → Anna

### Phase 2 — Automatisation avancée
- WF-06 : Chatbot RAG multilingue
- WF-07 : Indexation documents RAG
- WF-08 : Veille RSS sources marché
- WF-09 : Digest hebdomadaire Anna
- WF-10 : Alertes sectorielles

### Phase 3 — LinkedIn & Personal Branding *(en attente création profil Anna)*
- WF-11 à WF-18 : Génération posts LinkedIn, articles SEO, newsletter…

---

## Variables d'environnement

Voir [.env.example](.env.example) pour la liste complète.
**Ne jamais committer le fichier `.env`.**

---

## Déploiement production

Le déploiement est automatique via GitHub Actions sur push vers `main`.
Secrets requis dans GitHub : `SCALEWAY_HOST`, `SCALEWAY_USER`, `SCALEWAY_SSH_KEY`.

```bash
# Déploiement manuel si nécessaire
ssh user@votre-vps
cd /opt/cnl-sourcing
git pull origin main
docker compose up -d --build
docker system prune -f
```

---

## Documentation

- Architecture : `docs/architecture/`
- Runbooks opérationnels : `docs/runbooks/`
- CDC (Cahier des Charges) : document Google Drive partagé

---

*Projet développé pour CNL Sourcing — cnlsourcing.com*
