import type { MetadataRoute } from 'next';

import { PUBLIC_SURFACES } from '../../public-surfaces.mjs';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://rolepatch.com';
  const now = new Date();

  // Public HTML routes share one source of truth with /api/ai so a catalog
  // entry cannot drift out of the sitemap. User-specific app routes stay out.
  const machineSurfaces: Array<{
    path: string;
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
    priority: number;
  }> = [
    { path: '/llms.txt', changeFrequency: 'weekly', priority: 0.45 },
    { path: '/index.md', changeFrequency: 'weekly', priority: 0.45 },
    { path: '/api/ai', changeFrequency: 'weekly', priority: 0.4 },
  ];

  return [
    ...PUBLIC_SURFACES.map((surface) => ({
      url: new URL(surface.path, baseUrl).toString(),
      lastModified: now,
      changeFrequency: surface.changeFrequency as NonNullable<
        MetadataRoute.Sitemap[number]['changeFrequency']
      >,
      priority: surface.priority,
    })),
    ...machineSurfaces.map(({ path, changeFrequency, priority }) => ({
      url: `${baseUrl}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })),
  ];
}
