/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Pas de bloc i18n ici — next-intl App Router gère le routing via middleware

  images: {
    domains: ["cnlsourcing.com"],
  },

  experimental: {
    serverComponentsExternalPackages: ["pg"],
  },
};

module.exports = nextConfig;
