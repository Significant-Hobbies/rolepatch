import type { MetadataRoute } from 'next';
import { privatePaths, publicCrawlers } from '../../public-readability-policy.mjs';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: ['*', ...publicCrawlers].map((userAgent) => ({
      userAgent,
      allow: ['/', '/api/ai', '/api/md'],
      disallow: privatePaths,
    })),
    sitemap: 'https://rolepatch.com/sitemap.xml',
  };
}
