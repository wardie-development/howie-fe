import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.SITE_URL || 'https://better.wardie.com.br';
  return ['', '/demonstracao', '/fale-conosco', '/privacidade', '/termos'].map((path) => ({
    url: base + path,
    changeFrequency: path ? ('monthly' as const) : ('weekly' as const),
    priority: path ? 0.5 : 1,
  }));
}
