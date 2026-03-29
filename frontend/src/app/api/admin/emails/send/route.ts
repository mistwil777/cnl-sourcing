import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import Redis from "ioredis";

function makeRedis() {
  return new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: true, enableReadyCheck: false, maxRetriesPerRequest: 1, connectTimeout: 3000,
  });
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { to, to_name, subject, body } = await req.json().catch(() => ({}));
  if (!to || !subject || !body) {
    return NextResponse.json({ error: "to, subject, body requis" }, { status: 400 });
  }

  const brevoKey = process.env.BREVO_API_KEY;
  if (!brevoKey) return NextResponse.json({ error: "Brevo non configuré" }, { status: 503 });

  const fromAddress = process.env.GMAIL_FROM_ADDRESS ?? "cnlsourcingvn@gmail.com";

  const bodyHtml = body
    .split("\n")
    .map((l: string) => `<p style="margin:0 0 8px">${l || "&nbsp;"}</p>`)
    .join("");

  const payload = {
    sender:  { name: "Anna — CNL Sourcing", email: fromAddress },
    to:      [{ email: to, name: to_name ?? to }],
    subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
    htmlContent: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
        ${bodyHtml}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="font-size:12px;color:#999">CNL Sourcing — Sourcing international depuis le Vietnam<br>${fromAddress}</p>
      </div>`,
  };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method:  "POST",
      headers: { "api-key": brevoKey, "content-type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[emails/send] Brevo error:", err);
      return NextResponse.json({ error: "Erreur Brevo : " + err }, { status: 502 });
    }

    // Invalide le cache pour forcer un refresh au prochain chargement
    const r = makeRedis();
    r.del("emails:inbox:v1").catch(() => {});
    setTimeout(() => r.disconnect(), 2000);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[emails/send]", err);
    return NextResponse.json({ error: "Erreur réseau" }, { status: 500 });
  }
}
