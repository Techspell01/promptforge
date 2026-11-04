import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.promptforge.android",
  appName: "PromptForge",
  // The bundled static export; API calls go to NEXT_PUBLIC_API_BASE_URL over HTTPS.
  webDir: "out",
  server: {
    androidScheme: "https",
    cleartext: false,
    // No allowNavigation entries: the WebView stays on the bundled app and external links open in the browser.
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
    captureInput: true,
  },
};

export default config;
