import urllib.request, json

contenu = (
    "Au Vietnam, refuser une commande peut être le signe que vous avez trouvé le bon fournisseur.\n\n"
    "Contre-intuitif ? Pas tant que ça.\n\n"
    "La semaine dernière, je visitais un atelier de broderie à Hội An avec un client qui cherchait à produire "
    "500 pièces pour lancer sa collection. Le propriétaire a poliment décliné. Pas parce qu'il manquait de "
    "capacité — mais parce que ses délais de finition à la main ne lui permettaient pas de garantir la qualité "
    "sur ce volume en 6 semaines.\n\n"
    "Ce genre d'honnêteté, ça ne s'achète pas.\n\n"
    "J'ai appris depuis des années que les fournisseurs vietnamiens les plus fiables sont rarement ceux qui "
    "disent 'oui' à tout. Ils connaissent leurs limites, ils protègent leur réputation, et souvent ils vous "
    "orientent vers quelqu'un de mieux adapté à votre besoin. Cet atelier nous a recommandé un partenaire à "
    "Da Nang qui a livré exactement ce qui était promis, dans les délais.\n\n"
    "Le conseil concret pour les PME françaises : arrêtez de chercher le fournisseur le moins cher ou le plus "
    "flexible sur le papier. Cherchez celui qui ose vous dire non quand c'est nécessaire. C'est lui qui ne "
    "vous laissera pas tomber à J-15 avant votre lancement.\n\n"
    "Le bon partenariat commence par une relation de confiance, pas par un devis.\n\n"
    "Vous cherchez des fournisseurs vietnamiens sélectionnés pour leur fiabilité ? Parlons-en en commentaire ou en DM.\n\n"
    "#Sourcing #Vietnam #PMEfrançaises #Textile #ImportExport #CNLSourcing"
)

# 1. Sauvegarder en base
payload = json.dumps({
    'contenu': contenu,
    'tokens_utilises': 650,
    'modele_utilise': 'claude-sonnet-4-6'
}).encode('utf-8')

req = urllib.request.Request(
    'https://cnlsourcing.com/api/internal/linkedin-posts',
    data=payload,
    headers={'x-internal-token': 'cnl-internal-2026', 'Content-Type': 'application/json'}
)
result = json.loads(urllib.request.urlopen(req).read().decode())
post_id = result['id']
print(f'✅ Post sauvegardé — ID: {post_id}')

# 2. Envoyer preview Telegram
bot_token = '8575274866:AAGSNLUGcQ3nOLDtKTd3C6aHAm4pTsKAvXQ'
chat_id   = '8233858020'
text = (
    f'✍️ <b>Post LinkedIn TEST</b>\n\n'
    f'{contenu}\n\n'
    f'─────────────────\n'
    f'📋 <b>Pour publier sur LinkedIn :</b> réponds <code>OK {post_id}</code>\n'
    f'✏️ Pour modifier : réponds avec le texte corrigé complet.'
)
tg_payload = json.dumps({
    'chat_id': chat_id,
    'parse_mode': 'HTML',
    'disable_web_page_preview': True,
    'text': text
}).encode('utf-8')

tg_req = urllib.request.Request(
    f'https://api.telegram.org/bot{bot_token}/sendMessage',
    data=tg_payload,
    headers={'Content-Type': 'application/json'}
)
tg_result = json.loads(urllib.request.urlopen(tg_req).read().decode())
print(f'✅ Telegram envoyé: {tg_result.get("ok")}')
print(f'\n👉 Réponds OK {post_id} sur Telegram pour publier sur LinkedIn')
