import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        allow: ["/api/og"],
        disallow: ["/fr/admin", "/en/admin", "/vi/admin", "/api/"],
      },
    ],
    sitemap: "https://cnlsourcing.com/sitemap.xml",
    host: "https://cnlsourcing.com",
  };
}
