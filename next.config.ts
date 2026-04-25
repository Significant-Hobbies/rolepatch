import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@saas-maker/ai'],
  images: { unoptimized: true },
  serverExternalPackages: ['@libsql/client', '@sparticuz/chromium', 'puppeteer-core', '@mozilla/readability', 'mammoth', 'pdf-parse'],
  outputFileTracingExcludes: {
    '*': [
      '@sparticuz/chromium/**',
      'puppeteer-core/**',
      '@puppeteer/**',
      'mammoth/**',
      '@mozilla/readability/**',
      'pdf-parse/**',
    ],
  },
};

export default nextConfig;
