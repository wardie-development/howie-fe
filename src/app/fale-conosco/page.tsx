import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, MessageCircle, Ticket } from 'lucide-react';
import AuthLayout from '@/components/auth-layout';
import { getSessionProfile } from '@/lib/session';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Fale conosco',
  description:
    'Precisa de ajuda com a Better? Abra um chamado, acompanhe o status e converse com nossa equipe pelo seu painel.',
  alternates: { canonical: '/fale-conosco' },
};
export default async function Contact() {
  const profile = await getSessionProfile().catch(() => null);
  if (profile) redirect('/app/suporte');
  return (
    <AuthLayout>
      <div className="eyebrow">ESTAMOS POR PERTO</div>
      <h1>
        Como podemos
        <br />
        ajudar você?
      </h1>
      <p className="auth-subtitle">
        A equipe Better está aqui para ajudar. Entre na sua conta para abrir um chamado e acompanhar
        cada atualização.
      </p>
      <div className="contact-benefits">
        <p>
          <Ticket size={20} />
          Um código para cada chamado
        </p>
        <p>
          <MessageCircle size={20} />
          Conversa e status sempre disponíveis
        </p>
      </div>
      <Link className="button primary" href="/login?next=/app/suporte">
        Entrar e falar com a equipe
        <ArrowRight size={17} />
      </Link>
      <p className="contact-account">
        Ainda não tem conta? <Link href="/cadastro">Crie sua conta</Link>. O suporte está disponível
        mesmo durante a ativação.
      </p>
    </AuthLayout>
  );
}
