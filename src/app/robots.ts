import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/app', '/api/', '/login', '/cadastro'] },
    sitemap: `${process.env.SITE_URL || 'https://better.wardie.com.br'}/sitemap.xml`,
  };
}
