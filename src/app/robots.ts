import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://cinemawritings.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Disallow authenticated app routes — no indexing value and may expose IDs
        disallow: ["/editor/", "/directors-suite/", "/storyboard/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
