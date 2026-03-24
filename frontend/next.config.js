/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  i18n: {
    locales: ["fr", "en", "vi"],
    defaultLocale: "fr",
  },

  images: {
    domains: ["cnlsourcing.com"],
  },

  experimental: {
    serverComponentsExternalPackages: ["pg"],
  },
};

module.exports = nextConfig;
