import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
  serverExternalPackages: ['@brief-jetzt/wasm-typst'],
};

export default nextConfig;
