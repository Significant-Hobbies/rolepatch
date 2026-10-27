export const publicIdentity = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': 'https://sarthakagrawal.dev/#person',
      name: 'Sarthak Agrawal',
      jobTitle: 'AI Infrastructure & Product Engineer',
      url: 'https://sarthakagrawal.dev',
      image: 'https://avatars.githubusercontent.com/u/43884471?v=4',
      sameAs: [
        'https://sarthakagrawal.dev',
        'https://www.linkedin.com/in/sarthakagrawal927',
        'https://github.com/sarthakagrawal927',
        'https://x.com/sarthakcodes',
        'https://huggingface.co/sarthakagrawal927',
      ],
      knowsAbout: [
        'AI infrastructure',
        'Local-first software',
        'Post-training language models',
        'AI code review',
        'Cloudflare Workers',
        'TypeScript',
        'Rust',
      ],
      affiliation: {
        '@type': 'Organization',
        '@id': 'https://sassmaker.com/#app',
        name: 'SaaS Maker',
        url: 'https://sassmaker.com',
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://rolepatch.com/#app',
      name: 'RolePatch',
      alternateName: ['Role Patch', 'rolepatch.com'],
      url: 'https://rolepatch.com',
      description:
        'AI-powered resume tailoring. Score fit against a job description, rewrite bullets for the role, and prep interviews.',
      publisher: {
        '@id': 'https://sarthakagrawal.dev/#person',
      },
      sameAs: ['https://github.com/Significant-Hobbies/rolepatch'],
    },
  ],
};
