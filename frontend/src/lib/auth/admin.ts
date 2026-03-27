import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const COOKIE_NAME = "cnl_admin_token";

const secret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET || "dev-fallback-secret-min-32-chars!!");

export interface AdminPayload extends JWTPayload {
  role: "admin";
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(await secret());
}

export async function verifyAdminToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, await secret());
    if (payload.role !== "admin") return null;
    return payload as AdminPayload;
  } catch {
    return null;
  }
}

/** Vérifie le JWT depuis le header Cookie d'une Request. */
export async function requireAdmin(req: Request): Promise<AdminPayload | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  return verifyAdminToken(decodeURIComponent(match[1]));
}
