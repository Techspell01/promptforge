import type { MetadataRoute } from "next";

// Lets "Add to Home Screen" install PromptForge as a full-screen app with its own icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PromptForge",
    short_name: "PromptForge",
    description: "Turn a rough idea into a security-hardened build prompt for an AI coding agent.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
