/**
 * GET /api/og — Image Open Graph dynamique 1200×630
 * Params optionnels : ?title=&subtitle=
 */
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title    = searchParams.get("title")    ?? "Agent de sourcing Vietnam → France";
  const subtitle = searchParams.get("subtitle") ?? "Textile · Agroalimentaire · Artisanat — Fournisseurs audités, tarifs locaux";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "#1A1A2E",
          position: "relative",
          fontFamily: "Georgia, serif",
          overflow: "hidden",
        }}
      >
        {/* Bande rouge gauche */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "8px",
            height: "100%",
            background: "#C8102E",
          }}
        />

        {/* Cercle déco haut droite */}
        <div
          style={{
            position: "absolute",
            right: "-80px",
            top: "-80px",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            background: "rgba(200,16,46,0.12)",
          }}
        />

        {/* Cercle déco bas gauche */}
        <div
          style={{
            position: "absolute",
            left: "40px",
            bottom: "-60px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "rgba(212,175,55,0.08)",
          }}
        />

        {/* Contenu principal */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            height: "100%",
            padding: "55px 80px 50px 88px",
            gap: "32px",
          }}
        >
          {/* Corps : titre + sous-titre — EN PREMIER pour être visible même si l'image est rognée */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                color: "#FFFFFF",
                fontSize: "44px",
                fontWeight: "bold",
                lineHeight: "1.2",
                maxWidth: "900px",
              }}
            >
              {title}
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.65)",
                fontSize: "18px",
                lineHeight: "1.5",
                maxWidth: "780px",
              }}
            >
              {subtitle}
            </div>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Header : drapeaux + nom */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "36px" }}>🇻🇳</span>
            <span style={{ color: "#D4AF37", fontSize: "28px", fontWeight: "bold" }}>·</span>
            <span style={{ fontSize: "36px" }}>🇫🇷</span>
            <div
              style={{
                marginLeft: "20px",
                width: "1px",
                height: "36px",
                background: "rgba(255,255,255,0.2)",
              }}
            />
            <span
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "18px",
                letterSpacing: "3px",
                textTransform: "uppercase",
              }}
            >
              CNL Sourcing
            </span>
          </div>

          {/* Footer : badge PME */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "rgba(212,175,55,0.15)",
                border: "1px solid rgba(212,175,55,0.4)",
                borderRadius: "999px",
                padding: "10px 22px",
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#D4AF37",
                }}
              />
              <span style={{ color: "#D4AF37", fontSize: "18px", fontWeight: "600" }}>
                Spécialiste PME françaises
              </span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "18px" }}>
              cnlsourcing.com
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
