import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mytgo.app",
  appName: "E-Cars",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
