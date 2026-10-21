import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
const bodyFont = localFont({
  src: './fonts/dm-sans.woff2',
  variable: '--font-dm',
  display: 'swap',
  weight: '100 1000',
});
const headingFont = localFont({
  src: './fonts/manrope.woff2',
  variable: '--font-manrope',
  display: 'swap',
  weight: '200 800',
});
const site = process.env.SITE_URL || 'https://better.wardie.com.br';
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: 'Better — Atendimento com IA e agenda no WhatsApp', template: '%s | Better' },
  description:
    'Transforme conversas em agendamentos. Conheça a Better: agentes de IA para atender no WhatsApp, organizar serviços e cuidar da sua agenda.',
  applicationName: 'Better',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Better',
    title: 'Seu atendimento no ritmo do seu negócio.',
    description: 'Atendimento com IA, serviços e agenda em um só lugar.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#111e30' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${bodyFont.variable} ${headingFont.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
