import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// ─── Content Security Policy ──────────────────────────────────────────────
// Replace 'https://your-django-api.com' with your actual Django backend URL
// when deploying to production.
const cspDirectives = [
  "default-src 'self'",
  // Allow inline scripts for Next.js hydration; tighten after testing with nonces
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Allow inline styles for Tailwind CSS utility classes
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Allow data URIs and blobs for PDF/canvas export, all HTTPS images
  "img-src 'self' data: blob: https:",
  // Allow WebSocket and HTTPS connections to Supabase, Django API, and unpkg (for PDF.js cmaps/fonts)
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://unpkg.com",
    isDev ? "http://localhost:8000 ws://localhost:8000 http://127.0.0.1:8000 ws://127.0.0.1:8000" : "",
    process.env.NEXT_PUBLIC_API_URL ?? "",
  ]
    .filter(Boolean)
    .join(" "),
  // Block iframing of any page
  "frame-ancestors 'none'",
  // Allow blob: for PDF generation
  "worker-src 'self' blob:",
].join("; ");

// ─── Security Headers ────────────────────────────────────────────────────
const securityHeaders = [
  // DNS prefetching for performance
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // Force HTTPS for 2 years, include subdomains, allow preloading
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Block clickjacking
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Block MIME sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Limit referrer information to origin only on cross-origin requests
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Disable all browser features not needed by the app
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: cspDirectives,
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Strip all console.log calls in production builds
  // console.error is preserved for critical runtime errors
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
};

export default nextConfig;
