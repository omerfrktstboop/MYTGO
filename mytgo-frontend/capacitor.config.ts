import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mytgo.app",
  appName: "MYTGO",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
