import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  experimental: {
    serverActions: {
      // Logo do tenant sobe como data URL no server action de ajustes.
      bodySizeLimit: "2mb",
    },
  },
}

export default nextConfig
