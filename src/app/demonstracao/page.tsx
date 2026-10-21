import type { Metadata } from 'next';
import AuthForm from '@/components/auth-form';
import AuthLayout from '@/components/auth-layout';
export const metadata: Metadata = {
  title: 'Demonstração gratuita',
  description:
    'Veja como a Better pode ajudar no atendimento e na agenda do seu negócio. Solicite uma demonstração gratuita e sem compromisso.',
  alternates: { canonical: '/demonstracao' },
};
export default function Demo() {
  return (
    <AuthLayout>
      <div className="eyebrow">VAMOS CONVERSAR SOBRE SEU NEGÓCIO</div>
      <h1>
        Conheça a Better.
        <br />
        Do seu jeito.
      </h1>
      <p className="auth-subtitle">
        Deixe seu contato. Vamos combinar uma demonstração gratuita, sem compromisso.
      </p>
      <AuthForm mode="demo" />
    </AuthLayout>
  );
}
