// Canonical site URL for absolute links (sitemap, robots.txt, OG tags).
// Falls back to localhost for local dev — set NEXT_PUBLIC_SITE_URL to the
// real production domain once deployed (see .env.example).
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
