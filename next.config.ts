import type { NextConfig } from "next";

const isAndroidBuild = process.env.BUILD_TARGET === "android";

// Next injects inline bootstrap scripts, so script-src needs 'unsafe-inline' without per-request nonces.
// XSS is contained by never rendering model output as HTML; see the residual-risk notes in README.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

// A stray package-lock.json in the home folder otherwise makes Turbopack guess the wrong root.
const turbopack = { root: import.meta.dirname };

const webConfig: NextConfig = {
  reactStrictMode: true,
  turbopack,
  poweredByHeader: false,
  headers() {
    return Promise.resolve([{ source: "/:path*", headers: securityHeaders }]);
  },
};

// The APK bundles a static export of the UI only: API route files are `.ts`, pages are `.tsx`,
// so restricting page extensions to tsx leaves every server route out of the Android bundle.
const androidConfig: NextConfig = {
  reactStrictMode: true,
  turbopack,
  output: "export",
  pageExtensions: ["tsx"],
  images: { unoptimized: true },
  trailingSlash: true,
};

export default isAndroidBuild ? androidConfig : webConfig;
