import type { MetadataRoute } from 'next';

import { PUBLIC_SURFACES } from '../../public-surfaces.mjs';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://rolepatch.com';
  const now = new Date();

  // Public HTML routes share one source of truth with /api/ai so a catalog
  // entry cannot drift out of the sitemap. User-specific app routes stay out.
  return [
    ...PUBLIC_SURFACES.map((surface) => ({
      url: new URL(surface.path, baseUrl).toString(),
      lastModified: now,
      changeFrequency: surface.changeFrequency as NonNullable<
        MetadataRoute.Sitemap[number]['changeFrequency']
      >,
      priority: surface.priority,
    })),
  ];
}
