import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const contactSchema = z.object({
  nom:     z.string().min(2, "Nom requis"),
  email:   z.string().email("Email invalide"),
  sujet:   z.string().min(2, "Sujet requis"),
  message: z.string().min(10, "Message trop court (min 10 caractères)"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = contactSchema.parse(body);

    const BREVO_API_KEY = process.env.BREVO_API_KEY;

    if (BREVO_API_KEY) {
      // Envoi via Brevo (Sendinblue)
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key":     BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender:  { name: "CNL Sourcing — Site web", email: process.env.GMAIL_FROM_ADDRESS || "cnlsourcingvn@gmail.com" },
          to:      [{ email: "cnlsourcingvn@gmail.com", name: "Anna CNL Sourcing" }],
          replyTo: { email: data.email, name: data.nom },
          subject: `[Site CNL] ${data.sujet}`,
          htmlContent: `
            <h2>Nouveau message depuis cnlsourcing.com</h2>
            <p><strong>Nom :</strong> ${data.nom}</p>
            <p><strong>Email :</strong> ${data.email}</p>
            <p><strong>Sujet :</strong> ${data.sujet}</p>
            <hr/>
            <p>${data.message.replace(/\n/g, "<br/>")}</p>
          `,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("[Brevo error]", err);
        // On ne fait pas échouer — on log et on continue
      }
    } else {
      // Pas de clé Brevo : log en console (dev)
      console.log("[Contact form — pas de Brevo configuré]", data);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Données invalides", errors: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("[POST /api/contact]", err);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
