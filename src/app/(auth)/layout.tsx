import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function GuestLayout({ children }: { children: React.ReactNode }) {
  // An unavailable backend must not trap someone with an expired cookie in a redirect loop.
  const profile = await getSessionProfile().catch(() => null);
  if (profile) redirect('/app');
  return children;
}
