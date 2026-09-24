import type { NextConfig } from "next"
import { fileURLToPath } from "node:url"

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  transpilePackages: ["@workspace/ui"],
  experimental: {
    serverActions: {
      // Logo do tenant sobe como data URL no server action de ajustes.
      bodySizeLimit: "2mb",
    },
  },
}

export default nextConfig
