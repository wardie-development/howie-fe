import type { Metadata } from 'next';
import AcceptInvitation from '@/components/accept-invitation';
export const metadata: Metadata = {
  title: 'Aceitar convite',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
  alternates: { canonical: '/aceitar-convite' },
};
export default function InvitationPage() {
  return <AcceptInvitation />;
}
