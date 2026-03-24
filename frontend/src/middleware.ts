import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["fr", "en", "vi"],
  defaultLocale: "fr",
  localePrefix: "as-needed", // /fr → /, /en → /en, /vi → /vi
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
