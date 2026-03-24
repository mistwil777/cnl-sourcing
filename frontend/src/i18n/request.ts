import { getRequestConfig } from "next-intl/server";

const locales = ["fr", "en", "vi"];

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale)) {
    locale = "fr";
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
