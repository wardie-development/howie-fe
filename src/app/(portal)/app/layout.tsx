import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PortalShell from '@/components/portal-shell';
import { getSessionProfile } from '@/lib/session';
import type { Profile } from '@/lib/types';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Meu espaço',
  robots: { index: false, follow: false },
  alternates: { canonical: '/app' },
};
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  let profile: Profile | null;
  try {
    profile = await getSessionProfile();
  } catch {
    return (
      <main className="not-found">
        <h1>Estamos tentando reconectar.</h1>
        <p>O serviço está indisponível neste momento. Atualize a página para tentar novamente.</p>
        <a className="button primary" href="/app">
          Tentar novamente
        </a>
      </main>
    );
  }
  if (!profile) redirect('/login');
  return <PortalShell profile={profile}>{children}</PortalShell>;
}
