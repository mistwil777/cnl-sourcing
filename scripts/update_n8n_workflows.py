"""
Met à jour WF-11 et WF-15 sur n8n pour ajouter le bouton inline Telegram.
Usage : python3 scripts/update_n8n_workflows.py
"""
import json, urllib.request, urllib.error

API = "http://localhost:5678/api/v1"
KEY = "n8n_api_cnlsourcing2026deploy"


def api(method, path, data=None):
    req = urllib.request.Request(
        f"{API}{path}",
        data=json.dumps(data).encode() if data else None,
        headers={"X-N8N-API-KEY": KEY, "Content-Type": "application/json"},
        method=method,
    )
    try:
        return json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        print("HTTP Error", e.code, e.read().decode()[:600])
        raise


def put_workflow(wf_id, wf):
    return api("PUT", f"/workflows/{wf_id}", {
        "name": wf["name"],
        "nodes": wf["nodes"],
        "connections": wf["connections"],
        "settings": wf["settings"],
        "staticData": wf.get("staticData"),
    })


# ── WF-11 : bouton inline ✅ Publier sur LinkedIn ───────────────────────────
wf11 = api("GET", "/workflows/ml3e86dF90DPFrgP")

NEW_TG_BODY = (
    "={{ JSON.stringify({\n"
    "  chat_id: $env.TELEGRAM_CHAT_ID,\n"
    "  parse_mode: 'HTML',\n"
    "  disable_web_page_preview: true,\n"
    "  text: '\u270d\ufe0f <b>Post LinkedIn du jour</b>\\n\\n'"
    " + $('Extraire texte du post').first().json.contenu"
    " + '\\n\\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\\n"
    "\u270f\ufe0f Pour modifier : r\u00e9ponds avec le texte corrig\u00e9 complet.',\n"
    "  reply_markup: JSON.stringify({ inline_keyboard: [[\n"
    "    { text: '\u2705 Publier sur LinkedIn',\n"
    "      callback_data: 'approve:' + $('Sauvegarder post en base').first().json.id }\n"
    "  ]] })\n"
    "}) }}"
)

for node in wf11["nodes"]:
    if "Telegram" in node["name"] and "Preview" in node["name"]:
        node["parameters"]["jsonBody"] = NEW_TG_BODY
        print(f"WF-11 — modifié : {node['name']}")

res = put_workflow("ml3e86dF90DPFrgP", wf11)
print("WF-11 sauvegardé :", res.get("id"))


# ── WF-15 : gérer callback_query + ack ──────────────────────────────────────
wf15 = api("GET", "/workflows/pVbYcRRCL00A2aXl")

NEW_PARSE_CODE = r"""
const body = $input.first().json.body || $input.first().json;
const cbq  = body.callback_query;
const msg  = body.message || body.edited_message;
const ANNA_CHAT_ID = $env.TELEGRAM_CHAT_ID;

// ── Bouton inline (callback_query) ──────────────────────────────────────────
if (cbq) {
  const chatId = String(cbq.message?.chat?.id || cbq.from?.id || '');
  const fromId = String(cbq.from?.id || '');
  if (chatId !== ANNA_CHAT_ID && fromId !== ANNA_CHAT_ID) return [];
  const data = cbq.data || '';
  if (data.startsWith('approve:')) {
    const postId = data.replace('approve:', '');
    return [{ json: { type: 'approve', postId, callbackId: cbq.id, chatId, text: '' } }];
  }
  return [];
}

// ── Message texte classique ─────────────────────────────────────────────────
if (!msg) return [];
const chatId   = String(msg.chat?.id || '');
const text     = (msg.text || '').trim();
const fromId   = String(msg.from?.id || '');
const dateUnix = msg.date || Math.floor(Date.now()/1000);
if (chatId !== ANNA_CHAT_ID && fromId !== ANNA_CHAT_ID) return [];

const now   = new Date(dateUnix * 1000);
const day   = now.getDay();
const diff  = day === 0 ? -6 : 1 - day;
const lundi = new Date(now);
lundi.setDate(now.getDate() + diff);
lundi.setHours(0, 0, 0, 0);
const semaine = lundi.toISOString().split('T')[0];

const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
const postId    = uuidMatch ? uuidMatch[0] : null;
let type = 'insight';
let instructions = '';
if (postId) {
  const isOk = /^ok\b/i.test(text);
  if (isOk) { type = 'approve'; }
  else { type = 'modifier'; instructions = text.replace(uuidMatch[0], '').replace(/^[\s\-:,]+/, '').trim(); }
}
return [{ json: { text, semaine, type, postId, instructions, chatId, callbackId: null } }];
"""

ACK_NODE = {
    "id": "wf15-node-0009-ack-callback",
    "name": "Telegram \u2014 Ack bouton",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.1,
    "position": [960, 300],
    "parameters": {
        "method": "POST",
        "url": "={{ 'https://api.telegram.org/bot' + $env.TELEGRAM_BOT_TOKEN + '/answerCallbackQuery' }}",
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": (
            "={{ JSON.stringify({"
            " callback_query_id: $('Extraire et classifier message Anna').first().json.callbackId,"
            " text: '\u2705 Publication en cours\u2026'"
            " }) }}"
        ),
        "options": {"timeout": 5000},
    },
}

for node in wf15["nodes"]:
    if node["id"] == "wf15-node-0002-parse-msg":
        node["parameters"]["jsCode"] = NEW_PARSE_CODE
        print("WF-15 — parse node mis à jour")

existing_ids = [n["id"] for n in wf15["nodes"]]
if ACK_NODE["id"] not in existing_ids:
    wf15["nodes"].append(ACK_NODE)
    print("WF-15 — noeud ack ajouté")

wf15["connections"]["Approuver post LinkedIn"] = {
    "main": [[{"node": "Telegram \u2014 Ack bouton", "type": "main", "index": 0}]]
}

res = put_workflow("pVbYcRRCL00A2aXl", wf15)
print("WF-15 sauvegardé :", res.get("id"))
print("\nTerminé \u2014 les deux workflows sont mis à jour.")
