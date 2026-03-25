---
name: token-cost-optimizer
description: Implement LLM cost reduction architecture (70-85% savings) using prompt caching, Redis cache, RAG compression, Haiku/Sonnet routing, and Ollama for internal tasks. Use on any project with Claude API or OpenAI that needs cost control.
author: Wilfried Leroulier
version: 1.0
tested_on: CNL Sourcing (March 2026)
---

# SKILL — Token Cost Optimizer
## Architecture de réduction des coûts LLM pour projets clients PME

**Version** : 1.0
**Auteur** : Wilfried Leroulier — Architecte IA
**Projet pilote** : CNL Sourcing
**Réduction coûts validée** : 70-85% vs architecture naïve

---

## QUAND UTILISER CETTE SKILL

Utilise cette skill sur tout projet client qui :
- Intègre un chatbot ou une IA conversationnelle
- Utilise Claude API (Haiku, Sonnet) ou OpenAI (GPT-4o, GPT-4o-mini)
- Doit maîtriser ses coûts d'utilisation (PME, startups, associations)
- Traite des volumes répétitifs (FAQ, questions récurrentes)

**Ne pas utiliser si** :
- Le client a un budget IA illimité
- Les requêtes sont toutes uniques (pas de répétition possible)
- Le modèle est local (Ollama seul) — pas de coût variable

---

## LES 5 TECHNIQUES — ORDRE D'IMPLÉMENTATION

### TECHNIQUE 1 — Prompt Caching Anthropic ⭐ PRIORITÉ ABSOLUE
**Impact : -70 à -97% sur les tokens répétitifs**
**Complexité : Faible**
**Compatibilité : Claude uniquement (Haiku et Sonnet)**

#### Principe
Marquer les blocs stables du prompt avec `cache_control: {type: "ephemeral"}`.
Ces blocs sont mis en cache côté Anthropic pendant 5 minutes.
Coût des tokens en cache : 10% du prix normal.

#### Ce qu'on met en cache (ordre de priorité)
1. System prompt (instructions, persona) — change rarement
2. Documents RAG statiques (FAQ, process) — change rarement
3. Contexte métier long — change rarement

#### Ce qu'on ne met PAS en cache
- Les messages utilisateur (changent à chaque fois)
- Les résultats de recherche temps réel
- Les données personnalisées par utilisateur

#### Code de référence (TypeScript/Node.js)
```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  system: [
    {
      type: 'text',
      text: SYSTEM_PROMPT,           // ~500 tokens
      cache_control: { type: 'ephemeral' }  // Caché 5 min
    },
    {
      type: 'text',
      text: RAG_STATIC_CONTEXT,      // ~1000 tokens
      cache_control: { type: 'ephemeral' }  // Caché 5 min
    }
  ],
  messages: userMessages,  // Jamais caché
  betas: ['prompt-caching-2024-07-31'],
});

// Vérification dans usage
const cacheHit = response.usage.cache_read_input_tokens > 0;
const savings = response.usage.cache_read_input_tokens * 0.9; // 90% économisé
```

#### Économie calculée
- System prompt = 500 tokens × 1000 requêtes/mois = 500K tokens
- Sans cache : 500K × 3€/1M = 1.50€
- Avec cache : 500K × 0.30€/1M = 0.15€
- **Économie : 1.35€/mois sur le system prompt seul**

---

### TECHNIQUE 2 — Cache Redis des réponses ⭐ HAUTE PRIORITÉ
**Impact : 100% d'économie sur les questions répétées**
**Complexité : Faible**
**Compatibilité : Tous les LLM**

#### Principe
Stocker les réponses LLM dans Redis avec une clé basée sur
le hash MD5 de la question normalisée. TTL : 6 heures.
Questions identiques → réponse instantanée, 0 token consommé.

#### Normalisation de la question
```python
def normalize(text: str) -> str:
    return (text.lower()
               .strip()
               .replace('?', '').replace('!', '').replace(',', '')
               .replace('  ', ' ')
               [:200])  # Tronque à 200 chars

key = f"chat:{md5(normalize(question))}"
```

#### Taux de cache attendu par type de projet
| Type de projet | Taux cache hit estimé |
|---|---|
| FAQ chatbot (questions récurrentes) | 30-50% |
| Support client (questions variées) | 15-25% |
| Assistant général | 5-15% |
| Chatbot CNL Sourcing | 25-35% estimé |

#### Configuration Redis recommandée
```yaml
redis:
  image: redis:7-alpine
  command: >
    redis-server
    --requirepass ${REDIS_PASSWORD}
    --maxmemory 256mb
    --maxmemory-policy allkeys-lru
    --save ""
```

---

### TECHNIQUE 3 — Prompt Compression ⭐ PRIORITÉ MOYENNE
**Impact : -30 à -50% sur les tokens RAG**
**Complexité : Moyenne**
**Compatibilité : Tous les LLM**

#### Algorithme de compression (Python)
```python
def compress_rag_context(documents: list, max_tokens: int = 800) -> str:
    docs = sorted(documents, key=lambda x: x['score'], reverse=True)
    compressed = []
    for doc in docs:
        sentences = [s.strip() for s in doc['content'].split('.')
                    if len(s.strip()) > 30]
        top_sentences = sentences[:3]
        compressed.append(f"[{doc['source']}] {'. '.join(top_sentences)}")
    result = ''
    for chunk in compressed:
        if len(result + chunk) / 4 > max_tokens:
            break
        result += chunk + '\n\n'
    return result.strip()

def compress_history(history: list, keep_last: int = 3) -> list:
    if len(history) <= keep_last * 2:
        return history
    recent = history[-(keep_last * 2):]
    older_count = len(history) - len(recent)
    return [{'role': 'system',
             'content': f'[{older_count} messages précédents résumés]'}] + recent
```

---

### TECHNIQUE 4 — Routage LLM Intelligent ⭐ PRIORITÉ HAUTE
**Impact : -60 à -80% sur les coûts Sonnet (80% requêtes → Haiku)**
**Complexité : Faible**
**Compatibilité : Projets multi-modèles**

#### Arbre de décision universel
```
Question reçue
├── Salutation / message très court ?       → HAIKU
├── Score RAG >= 0.78 ET question simple ?  → HAIKU
├── Question hors sujet / spam ?            → HAIKU
└── Question complexe / RAG insuffisant ?   → SONNET
```

#### Comparatif coûts (Anthropic, Mars 2026)
| Modèle | Input (€/1M) | Output (€/1M) | Cache read (€/1M) |
|---|---|---|---|
| Claude Haiku | 0.80€ | 4€ | 0.08€ |
| Claude Sonnet | 3€ | 15€ | 0.30€ |

#### Règle des 80/20
Coût moyen = (0.80 × 0.80€) + (0.20 × 3€) = **1.24€/1M** vs tout Sonnet = **3€/1M** → -59%

---

### TECHNIQUE 5 — Ollama pour tâches internes
**Impact : 100% d'économie sur les tâches non critiques**
**Complexité : Moyenne**
**Compatibilité : Serveur avec ≥ 8GB RAM**

#### Cas d'usage validés
| Tâche | Modèle | RAM |
|---|---|---|
| Scoring pertinence RAG | phi3:mini | 2GB |
| Classification de demandes | llama3.2:1b | 2GB |
| Détection de langue | phi3:mini | 2GB |
| Résumés internes | llama3.2:3b | 4GB |

#### Cas NON adaptés à Ollama
- Réponses au client (qualité insuffisante en multilingue)
- Génération de contenu commercial
- Analyse juridique ou douanière (hallucinations)

#### Fallback automatique obligatoire
```python
try:
    score = score_with_ollama(text)
except Exception:
    score = score_with_keywords(text)  # Fallback gratuit
```

---

## ARCHITECTURE TYPE

```
REQUÊTE CLIENT
    │
    ▼
CACHE REDIS (TTL 6h) ──── HIT → Réponse instantanée (0€)
    │ MISS
    ▼
RAG HYBRIDE + COMPRESSION (budget 800 tokens)
    │
    ▼
ROUTEUR LLM
    ├── HAIKU (80% cas) + Prompt Cache → 0.80€/1M
    └── SONNET (20% cas) + Prompt Cache → 3€/1M
    │
    ▼
REDIS SET + LOG PostgreSQL (usage_logs)
```

---

## VARIABLES D'ENVIRONNEMENT STANDARD

```env
LLM_MODEL_FAST=claude-haiku-4-5-20251001
LLM_MODEL_SMART=claude-sonnet-4-6
LLM_MODEL_LOCAL=phi3:mini
LLM_RAG_THRESHOLD_HAIKU=0.78
LLM_MESSAGE_LENGTH_HAIKU=200
REDIS_CACHE_TTL=21600
LLM_CACHE_ENABLED=true
RAG_MAX_TOKENS=800
RAG_HISTORY_KEEP_LAST=3
LLM_BUDGET_EUR_MONTH=30
LLM_ALERT_THRESHOLD=0.80
OLLAMA_URL=http://ollama:11434
OLLAMA_SCORING_MODEL=phi3:mini
OLLAMA_ENABLED=true
```

---

## MONITORING — MÉTRIQUES CLÉS

| Métrique | Objectif | Alerte si |
|---|---|---|
| Taux cache Redis | > 25% | < 10% |
| % requêtes Haiku | > 75% | < 60% |
| Tokens cache_read | > 60% input | < 30% |
| Coût moyen / requête | < 0.005€ | > 0.015€ |
| Coût total / mois | < budget | > 80% budget |

---

## ÉCONOMIES ATTENDUES

| Architecture | 1K req/mois | 10K req/mois |
|---|---|---|
| Naïve (tout Sonnet, pas de cache) | ~18€ | ~180€ |
| Routage Haiku/Sonnet seul | ~8€ | ~80€ |
| + Cache Redis (25% hit rate) | ~6€ | ~60€ |
| + Prompt Caching Anthropic | ~2.5€ | ~25€ |
| + Compression RAG | ~1.8€ | ~18€ |
| + Ollama scoring interne | ~1.5€ | ~15€ |
| **Stack complète** | **~1.5€** | **~15€** |
| **Réduction totale** | **-92%** | **-92%** |

---

## CHECKLIST D'IMPLÉMENTATION

### Semaine 1 (must-have)
- [ ] Routage Haiku/Sonnet selon complexité
- [ ] Prompt Caching sur system prompt
- [ ] Cache Redis sur questions fréquentes
- [ ] Table usage_logs PostgreSQL
- [ ] Dashboard coûts basique

### Semaine 2 (recommandé)
- [ ] Compression du contexte RAG
- [ ] Compression de l'historique
- [ ] Prompt Caching sur documents RAG statiques
- [ ] Alertes budget (email si > 80% budget)

### Semaine 3 (optimisation)
- [ ] Ollama pour scoring RAG interne
- [ ] Fine-tuning des seuils de routage
- [ ] Rapport mensuel automatique coûts
- [ ] A/B test Haiku vs Sonnet sur cas limites

---

## FICHIERS DE RÉFÉRENCE (CNL Sourcing — implémentation pilote)

```
frontend/src/lib/rag/claude.ts          # Prompt caching Anthropic
frontend/src/lib/cache/redis.ts         # Cache Redis (ioredis)
frontend/src/lib/rag/compressor.ts      # Compression RAG + historique
frontend/src/lib/rag/router.ts          # Routeur Haiku/Sonnet
frontend/src/lib/cost/logger.ts         # Log tokens → PostgreSQL
frontend/src/app/api/chat/route.ts      # Pipeline complet intégré
frontend/src/components/admin/CostWidget.tsx  # Dashboard coûts
frontend/src/app/api/admin/cost-stats/route.ts
database/migrations/002_cost_monitoring.sql   # usage_logs + vues
backend/rag/scripts/collect_rss.py      # Scoring Ollama → Haiku → keywords
```

---

## RÉFÉRENCES

- Anthropic Prompt Caching : https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- Anthropic Pricing : https://www.anthropic.com/pricing
- Ollama Models : https://ollama.ai/library

---

*Skill développée sur le projet CNL Sourcing — Validée Mars 2026*
*Réutilisable sur tout projet LLM à coûts variables*
