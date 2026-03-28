# CLAUDE.md — CNL Sourcing

## Stack technique
Next.js 14 App Router · TypeScript · PostgreSQL 16 · Redis · LanceDB (RAG)
n8n (workflows) · Docker Compose · Nginx · Let's Encrypt
VPS : Scaleway 51.158.109.135 — Domaine : cnlsourcing.com

## Règle : lire l'INDEX avant tout développement
```
~/.claude/skills/INDEX.md
```
Charge uniquement la skill pertinente, jamais plus de 2 à la fois.

## Atelier de skills
Repo : github.com/mistwil777/wilfried-ai-factory (privé)
Index local : ~/.claude/skills/INDEX.md
Sync : `bash ~/Documents/GitHub/wilfried-ai-factory/sync-skills.sh`

### Skills actives sur ce projet
| Skill | Statut |
|-------|--------|
| `core/token-cost-optimizer` | ✅ Implémentée |
| `core/crud-admin-interface` | ✅ Implémentée |
| `core/statut-workflow` | ✅ Implémentée |
| `core/rag-dynamique` | ✅ Implémentée |
| `core/notification-multicanal` | ✅ Implémentée |
| `metier/sourcing-international` | ✅ Appliquée |
| `metier/facturation-pme` | ✅ Implémentée |
| `qualite/checklist-deploiement` | ✅ Appliquée |

## Principes non négociables
1. Scripts SQL/Bash d'abord — IA uniquement si valeur ajoutée réelle
2. Toujours logger les tokens dans `usage_logs` (table existante)
3. Routage Haiku/Sonnet selon complexité (seuil 0.78)
4. Cache Redis sur les réponses LLM (TTL 6h)
5. Notifications fire-and-forget : `.catch(() => {})` obligatoire
6. Auth `requireAdmin` sur chaque route API admin
7. COALESCE sur chaque champ dans les PATCH (partialité)

## Migrations à jouer dans l'ordre
```bash
docker exec -i cnl_postgres psql -U cnl_user -d cnlsourcing < database/migrations/00N_xxx.sql
```
Fichiers : 001 → 007 (dans l'ordre numérique)

## Déploiement prod
Prérequis DNS → `./deploy.sh` (script complet Certbot + Docker Compose)
Voir `qualite/checklist-deploiement.md` avant chaque déploiement.
