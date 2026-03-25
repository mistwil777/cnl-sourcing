import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ─── Constantes ───────────────────────────────────────────────────────────────
const SENDER    = { name: "Anna — CNL Sourcing", email: "cnlsourcingvn@gmail.com" };
const RECIPIENT = { name: "Anna — CNL Sourcing", email: "cnlsourcingvn@gmail.com" };

// ─── Rate limiting (in-memory, max 3 req/IP/heure) ───────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now   = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

// ─── Validation Zod (messages trilingues FR / EN / VI) ───────────────────────
const contactSchema = z.object({
  nom: z.string().min(2, {
    message: "Nom requis (min. 2 caractères) · Name required (min. 2 chars) · Họ tên tối thiểu 2 ký tự",
  }),
  email: z.string().email({
    message: "Adresse email invalide · Invalid email address · Địa chỉ email không hợp lệ",
  }),
  sujet: z.string().min(2, {
    message: "Sujet requis (min. 2 caractères) · Subject required · Chủ đề tối thiểu 2 ký tự",
  }),
  message: z.string().min(10, {
    message: "Message trop court (min. 10 caractères) · Message too short (min. 10 chars) · Tin nhắn quá ngắn (tối thiểu 10 ký tự)",
  }),
});

// ─── Brevo ───────────────────────────────────────────────────────────────────
async function sendEmail(apiKey: string, payload: object): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method:  "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Brevo ${res.status}: ${JSON.stringify(err)}`);
  }
}

function sanitize(str: string) {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
}

// ─── PostgreSQL error logging (non-bloquant) ─────────────────────────────────
async function logErrorToDb(message: string, context: object): Promise<void> {
  try {
    const { db } = await import("@/lib/db/client");
    await db.query(
      `INSERT INTO logs_workflows
         (workflow_nom, statut, erreur_message, donnees_entree)
       VALUES ($1, $2, $3, $4)`,
      ["contact_form", "erreur", message, JSON.stringify(context)]
    );
  } catch {
    // DB indisponible — on ne bloque pas la réponse
    console.error("[contact] DB log failed:", message);
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
          ?? req.headers.get("x-real-ip")
          ?? "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      {
        message:
          "Trop de tentatives — réessayez dans 1 heure · Too many attempts — try again in 1 hour · Quá nhiều lần thử — vui lòng thử lại sau 1 giờ",
      },
      { status: 429 }
    );
  }

  // 2. Parse + validation
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Corps de requête invalide" }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Données invalides", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // 3. Brevo — envoi des deux emails
  const BREVO_API_KEY = process.env.BREVO_API_KEY;

  if (!BREVO_API_KEY) {
    console.warn("[contact] BREVO_API_KEY manquante — email non envoyé", data);
    return NextResponse.json({ success: true }, { status: 200 });
  }

  try {
    // Email A — Notification interne à Anna
    await sendEmail(BREVO_API_KEY, {
      sender:      SENDER,
      to:          [RECIPIENT],
      replyTo:     { email: data.email, name: data.nom },
      subject:     `[Site CNL] ${data.sujet}`,
      htmlContent: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#1a1a2e;margin-bottom:16px">📩 Nouveau message — cnlsourcing.com</h2>
          <table style="width:100%;border-collapse:collapse;font-size:15px">
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:8px 0;color:#888;width:80px">Nom</td>
              <td style="padding:8px 0;font-weight:600">${sanitize(data.nom)}</td>
            </tr>
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:8px 0;color:#888">Email</td>
              <td style="padding:8px 0"><a href="mailto:${data.email}" style="color:#c0392b">${data.email}</a></td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#888">Sujet</td>
              <td style="padding:8px 0">${sanitize(data.sujet)}</td>
            </tr>
          </table>
          <hr style="margin:16px 0;border:none;border-top:1px solid #eee"/>
          <p style="white-space:pre-wrap;color:#333;line-height:1.6">${sanitize(data.message)}</p>
        </div>
      `,
    });

    // Email B — Accusé de réception au client
    await sendEmail(BREVO_API_KEY, {
      sender:      SENDER,
      to:          [{ email: data.email, name: data.nom }],
      replyTo:     RECIPIENT,
      subject:     "Votre message a bien été reçu — CNL Sourcing",
      htmlContent: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#333">
          <h2 style="color:#1a1a2e">Merci pour votre message, ${sanitize(data.nom)} !</h2>
          <p style="line-height:1.6">
            Nous avons bien reçu votre demande et vous répondrons dans les
            <strong>24 heures</strong> (jours ouvrés).
          </p>
          <p style="color:#666;font-size:14px;margin-top:16px">Récapitulatif :</p>
          <blockquote style="border-left:3px solid #c0392b;margin:0;padding:12px 16px;background:#fafafa;border-radius:0 4px 4px 0">
            <strong style="color:#1a1a2e">${sanitize(data.sujet)}</strong><br/>
            <span style="font-size:14px;color:#555;line-height:1.6">${sanitize(data.message)}</span>
          </blockquote>
          <p style="margin-top:24px;line-height:1.6">
            À très bientôt,<br/>
            <strong>Anna — CNL Sourcing</strong>
          </p>
          <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
          <p style="font-size:12px;color:#999">
            CNL Sourcing ·
            <a href="mailto:cnlsourcingvn@gmail.com" style="color:#c0392b">cnlsourcingvn@gmail.com</a>
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[contact] Brevo error:", errMsg);

    // Log en base (non-bloquant)
    await logErrorToDb(errMsg, { ip, nom: data.nom, email: data.email, sujet: data.sujet });

    return NextResponse.json(
      {
        message:
          "L'envoi a échoué, veuillez réessayer ou écrire directement à cnlsourcingvn@gmail.com · " +
          "Sending failed, please retry or email cnlsourcingvn@gmail.com directly · " +
          "Gửi thất bại, vui lòng thử lại hoặc liên hệ cnlsourcingvn@gmail.com",
      },
      { status: 500 }
    );
  }
}
