#!/bin/bash
# =============================================================================
# CNL Sourcing — Import des workflows n8n + setup Telegram webhook
# Lancer depuis le VPS : bash scripts/setup-n8n-workflows.sh
# =============================================================================
set -e

# Charger les variables d'env
source /opt/cnl-sourcing/.env.production 2>/dev/null || source /opt/cnl-sourcing/.env

WORKFLOWS_DIR="/opt/cnl-sourcing/n8n/workflows"
N8N_CONTAINER="cnl_n8n"

echo "=== Import des workflows n8n ==="

for wf in WF-01_analyse_demande WF-11_linkedin_posts WF-14_veille_rss WF-15_digest_hebdo WF-16_alertes_sectorielles; do
  FILE="${WORKFLOWS_DIR}/${wf}.json"
  if [ -f "$FILE" ]; then
    echo "→ Import $wf ..."
    docker exec "$N8N_CONTAINER" n8n import:workflow --input="/home/node/.n8n/workflows/${wf}.json" 2>&1 || echo "  ⚠ Erreur import $wf (peut-être déjà importé)"
  else
    echo "  ✗ Fichier manquant : $FILE"
  fi
done

echo ""
echo "=== Setup webhook Telegram (bot → n8n) ==="

# URL du webhook n8n qui recevra les messages d'Anna
WEBHOOK_URL="https://${DOMAIN:-cnlsourcing.com}/n8n/webhook/telegram-anna-incoming"

echo "→ Enregistrement du webhook Telegram..."
RESPONSE=$(curl -s -X POST \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\", \"allowed_updates\": [\"message\"], \"drop_pending_updates\": true}")

echo "   Réponse Telegram : $RESPONSE"

if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "   ✅ Webhook Telegram configuré → $WEBHOOK_URL"
else
  echo "   ❌ Erreur configuration webhook"
fi

echo ""
echo "=== Activation des workflows dans n8n ==="
echo ""
echo "Connecte-toi à https://cnlsourcing.com/n8n puis active manuellement :"
echo "  ✓ WF-01 — Analyse demande (webhook)"
echo "  ✓ WF-14 — Veille RSS (cron quotidien 7h)"
echo "  ✓ WF-15 — Récepteur Telegram (webhook permanent)"
echo "  ✓ WF-16 — Check-in Anna (cron lundi 9h)"
echo "  ✗ WF-11 — Générateur LinkedIn (activer quand LinkedIn prêt)"
echo ""
echo "=== Migration base de données ==="
echo ""
echo "Lance si pas encore fait :"
echo "  docker exec -i cnl_postgres psql -U cnl_user -d cnlsourcing < /opt/cnl-sourcing/database/migrations/011_linkedin_veille.sql"
echo ""
echo "=== Terminé ==="
