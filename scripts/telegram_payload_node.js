const postId  = $('Sauvegarder post en base').first().json.id;
const contenu = $('Extraire texte du post').first().json.contenu;
const sep = '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500';
const text = '\u270d\ufe0f <b>Post LinkedIn du jour</b>\n\n' + contenu + '\n\n' + sep + '\n\u270f\ufe0f Pour modifier : r\u00e9ponds avec le texte corrig\u00e9 complet.';
return [{ json: {
  chat_id: $env.TELEGRAM_CHAT_ID,
  parse_mode: 'HTML',
  disable_web_page_preview: true,
  text: text,
  reply_markup: { inline_keyboard: [[{ text: '\u2705 Publier sur LinkedIn', callback_data: 'approve:' + postId }]] }
} }];
