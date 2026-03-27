# Contexte projet — CNL Sourcing
*À coller en début de conversation avec Claude pour reprendre où on en était.*

---

## Projet

**CNL Sourcing** — agence de sourcing Vietnam/France dirigée par Anna.
Stack : Next.js 14 App Router, PostgreSQL 16, Redis, n8n, LanceDB (RAG), Docker Compose, Nginx.
Repo GitHub : `mistwil777/cnl-sourcing`
VPS Scaleway : `51.158.109.135` — domaine : `cnlsourcing.com` (DNS en cours de configuration)

---

## Ce qui a été fait dans cette session

### 1. Déploiement production
- **`.env.production`** généré avec vrais secrets (JWT, Redis, n8n, Brevo, Telegram, Anthropic)
- **`deploy.sh`** : script en 4 étapes — copie `.env`, Certbot SSL standalone, `docker compose -f docker-compose.yml -f docker-compose.prod.yml up`, cron renouvellement SSL
- **`docker-compose.prod.yml`** : override nginx pour utiliser `nginx/nginx.conf` (SSL) au lieu de `nginx.dev.conf`
- **Redis** : mot de passe activé via `REDIS_PASSWORD`
- **`nginx/nginx.conf`** : déjà correct — HTTPS, `server_name cnlsourcing.com`, certs `/etc/nginx/ssl/fullchain.pem`

**Prérequis avant lancer `./deploy.sh` :**
- DNS `cnlsourcing.com` → `51.158.109.135` (enregistrement A racine + www)
- Repo cloné dans `/opt/cnl-sourcing` sur le VPS
- `ADMIN_PASSWORD=AnnaAdmin2026!` dans `.env.production`

---

### 2. Dashboard admin Anna (`/admin`)

**Accès** : `http://localhost/admin` — mot de passe local : `Anna2026!`

**Architecture :**
- `frontend/src/lib/auth/admin.ts` — JWT httpOnly cookie (8h, `jose`)
- `frontend/src/app/[locale]/admin/page.tsx` — server component, vérifie cookie → redirige `/admin/login`
- `frontend/src/app/[locale]/admin/login/page.tsx` — formulaire login
- `frontend/src/app/[locale]/admin/AdminDashboard.tsx` — client component, interface complète

**API routes créées :**
| Route | Méthode | Rôle |
|-------|---------|------|
| `/api/admin/auth/login` | POST | Login → cookie JWT |
| `/api/admin/dashboard` | GET | Toutes les données en une requête |
| `/api/admin/devis/creer` | POST | Crée un brouillon devis depuis une demande |
| `/api/admin/devis/modifier` | PATCH | Met à jour lignes, montants, conditions |
| `/api/admin/devis/envoyer` | POST | Statut → envoyé + email Brevo client |
| `/api/admin/facture/relancer` | POST | Email relance Claude Haiku + Brevo + log |

**Interface :**
- Header rouge CNL avec date + badge "Actions urgentes" si demandes urgentes ou factures en retard
- KPI 2×2 : demandes semaine / devis brouillon / paiements attendus / CA mois
- 4 onglets : Demandes, Devis, Factures, Coûts IA

**Onglet Demandes :**
- Tri par scoring urgence DESC (calculé depuis `analyse_ia.faisabilite_score / 2`)
- Badges urgence colorés (1-2 vert, 3 orange, 4-5 rouge)
- Modal "Voir détails" : questionnaire complet + résumé IA
- Bouton "Créer le devis" → crée brouillon + bascule sur onglet Devis

**Onglet Devis — modal complet en 4 sections :**
- Émetteur (CNL Sourcing)
- Client (entreprise, contact, adresse, SIRET, TVA intra)
- Prestations : lignes détaillées (description / quantité / prix HT / TVA 0-20%)
  → récapitulatif HT / TVA / TTC calculé en temps réel
- Conditions : paiement (4 presets + libre), Incoterms (FOB/EXW/CIF/DAP/DDP), pays livraison, notes

**Onglet Factures :**
- Badges statut calculés en SQL (en retard si date_echeance < NOW())
- Bouton "Relancer" → Claude Haiku génère email cordial sans Markdown → Brevo → table `relances`

**Onglet Coûts IA :**
- Budget mensuel avec barre de progression (alerte > 80%)
- Répartition Haiku/Sonnet en %
- Données depuis table `usage_logs`

---

### 3. Migrations base de données

| Migration | Contenu |
|-----------|---------|
| `001_init_schema.sql` | Schéma complet (clients, demandes, devis, factures, relances, analyse_ia…) |
| `002_cost_monitoring.sql` | Table `usage_logs`, fonction `calculate_cost()`, vues `cout_par_jour` / `cout_global` |
| `003_admin_test_data.sql` | 3 clients + 3 demandes + analyses IA + 1 facture en retard (données de test) |
| `004_devis_details.sql` | Colonnes `objet/lignes/conditions_paiement/incoterms/pays_livraison` sur `devis` + `adresse/siret/tva_intra` sur `clients` |

**Pour injecter les données de test :**
```bash
docker exec -i cnl_postgres psql -U cnl_user -d cnlsourcing < database/migrations/003_admin_test_data.sql
docker exec -i cnl_postgres psql -U cnl_user -d cnlsourcing < database/migrations/004_devis_details.sql
```

---

### 4. Variables d'environnement importantes

```env
# Local (.env)
ADMIN_PASSWORD=Anna2026!

# Production (.env.production — ne jamais commiter)
ADMIN_PASSWORD=AnnaAdmin2026!
REDIS_PASSWORD=xz6n2KSNhM4IxrLp
N8N_BASIC_AUTH_PASSWORD=gPatV05Yc3E0bli9
JWT_SECRET=<32 bytes hex>
N8N_ENCRYPTION_KEY=<32 bytes hex>
```

---

### 5. Prochaines étapes identifiées

- [ ] Configurer DNS cnlsourcing.com → 51.158.109.135 puis lancer `./deploy.sh`
- [ ] Phase 2 : génération PDF devis (bouton placeholder déjà présent)
- [ ] Ajouter `adresse` des clients dans le formulaire de demande (actuellement rempli manuellement dans le modal devis)
- [ ] Tableau de bord veille marché (table `veille_articles` prête)
- [ ] Intégration LinkedIn pour publication automatique (Phase 3)
