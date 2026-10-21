import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PortalShell from '@/components/portal-shell';
import type { Profile } from '@/lib/types';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Meu espaço',
  robots: { index: false, follow: false },
  alternates: { canonical: '/app' },
};
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get('better_session')?.value;
  if (!token) redirect('/login');
  const backend = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
  let response: Response;
  try {
    response = await fetch(`${backend.replace(/\/$/, '')}/api/v1/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
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
  if (response.status === 401 || response.status === 403) redirect('/login');
  if (!response.ok) throw new Error('Não foi possível carregar sua conta.');
  const profile: Profile = await response.json();
  return <PortalShell profile={profile}>{children}</PortalShell>;
}
