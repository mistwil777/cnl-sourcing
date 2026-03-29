import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import Redis from "ioredis";

const CACHE_KEY = "emails:inbox:v1";
const CACHE_TTL = 15 * 60; // 15 minutes

function makeRedis() {
  return new Redis({
    host:                 process.env.REDIS_HOST     || "localhost",
    port:                 parseInt(process.env.REDIS_PORT || "6379"),
    password:             process.env.REDIS_PASSWORD || undefined,
    lazyConnect:          true,
    enableReadyCheck:     false,
    maxRetriesPerRequest: 1,
    connectTimeout:       3000,
  });
}

export interface EmailItem {
  id:         string;
  uid:        number;
  from:       string;
  from_email: string;
  subject:    string;
  date:       string;
  snippet:    string;
  body:       string;
  seen:       boolean;
  importance: number;
  resume:     string;
  action:     string;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get("refresh") === "1";

  // ── Cache Redis ────────────────────────────────────────────────────────────
  if (!force) {
    try {
      const r = makeRedis();
      const cached = await r.get(CACHE_KEY);
      r.disconnect();
      if (cached) return NextResponse.json({ emails: JSON.parse(cached), cached: true });
    } catch {}
  }

  // ── Fetch IMAP ─────────────────────────────────────────────────────────────
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  const gmailUser   = process.env.GMAIL_FROM_ADDRESS ?? "cnlsourcingvn@gmail.com";

  if (!appPassword) {
    return NextResponse.json({ error: "GMAIL_APP_PASSWORD non configuré" }, { status: 503 });
  }

  let emails: Omit<EmailItem, "importance" | "resume" | "action">[] = [];

  try {
    const { ImapFlow }    = await import("imapflow");
    const { simpleParser } = await import("mailparser");

    const client = new ImapFlow({
      host:   "imap.gmail.com",
      port:   993,
      secure: true,
      auth:   { user: gmailUser, pass: appPassword },
      logger: false,
    });

    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const total = (client.mailbox as { exists?: number }).exists ?? 0;
      const from  = Math.max(1, total - 29);
      const range  = `${from}:${total}`;

      for await (const msg of client.fetch(range, { envelope: true, flags: true, source: true })) {
        try {
          if (!msg.source) continue;
          const parsed = await simpleParser(msg.source);
          const fromAddr = parsed.from?.value?.[0];
          const htmlText  = typeof parsed.html === "string" ? parsed.html.replace(/<[^>]+>/g, " ") : "";
          const body      = ((parsed.text ?? "").slice(0, 3000).replace(/\s+/g, " ").trim())
                         || (htmlText.slice(0, 3000).replace(/\s+/g, " ").trim());
          emails.push({
            id:         String(msg.uid),
            uid:        msg.uid,
            from:       fromAddr?.name ?? fromAddr?.address ?? "Inconnu",
            from_email: fromAddr?.address ?? "",
            subject:    parsed.subject ?? "(sans objet)",
            date:       (parsed.date ?? new Date()).toISOString(),
            snippet:    body.slice(0, 200),
            body,
            seen:       msg.flags?.has("\\Seen") ?? false,
          });
        } catch {}
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[emails] IMAP error:", msg);
    return NextResponse.json({ error: "Impossible de lire la boîte mail : " + msg }, { status: 502 });
  }

  emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ── Analyse Claude Haiku (batch) ──────────────────────────────────────────
  const emailsWithAI = await analyseEmails(emails);

  // ── Cache Redis ────────────────────────────────────────────────────────────
  try {
    const r = makeRedis();
    await r.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(emailsWithAI));
    r.disconnect();
  } catch {}

  return NextResponse.json({ emails: emailsWithAI, cached: false });
}

async function analyseEmails(
  emails: Omit<EmailItem, "importance" | "resume" | "action">[]
): Promise<EmailItem[]> {
  if (emails.length === 0) return [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return emails.map(e => ({ ...e, importance: 3, resume: e.snippet, action: "À traiter" }));

  const liste = emails.map((e, i) =>
    `[${i}] De: ${e.from} <${e.from_email}>\nObjet: ${e.subject}\nContenu: ${e.body.slice(0, 600)}`
  ).join("\n\n---\n\n");

  const prompt = `Tu es l'assistant de CNL Sourcing (sourcing international).
Analyse ces ${emails.length} emails et réponds UNIQUEMENT avec un tableau JSON.
Chaque objet : importance (1-5), resume (≤120 chars, français), action (≤60 chars, français).
importance 5=urgent/client mécontent | 4=demande/devis/commande | 3=question/suivi | 2=info | 1=newsletter/auto

Emails:
${liste}

JSON uniquement, pas de markdown :`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model:      process.env.ANTHROPIC_MODEL_FAST ?? "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages:   [{ role: "user", content: prompt }],
      }),
    });
    const json = await res.json();
    const text = json.content?.[0]?.text ?? "[]";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const analyses: { importance: number; resume: string; action: string }[] = JSON.parse(cleaned);
    return emails.map((e, i) => ({
      ...e,
      importance: analyses[i]?.importance ?? 3,
      resume:     analyses[i]?.resume     ?? e.snippet,
      action:     analyses[i]?.action     ?? "À traiter",
    }));
  } catch {
    return emails.map(e => ({ ...e, importance: 3, resume: e.snippet, action: "À traiter" }));
  }
}
