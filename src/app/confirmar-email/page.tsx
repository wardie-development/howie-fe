import type { Metadata } from 'next';
import { ConfirmEmail } from '@/components/email-verification';
export const metadata: Metadata = {
  title: 'Confirme seu e-mail',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
  alternates: { canonical: '/confirmar-email' },
};
export default function EmailConfirmation() {
  return <ConfirmEmail />;
}
