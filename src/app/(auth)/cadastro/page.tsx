import type { Metadata } from 'next';
import AuthForm from '@/components/auth-form';
import AuthLayout from '@/components/auth-layout';
export const metadata: Metadata = {
  title: 'Criar conta',
  robots: { index: false, follow: false },
  alternates: { canonical: '/cadastro' },
};
export default function Register() {
  return (
    <AuthLayout>
      <div className="eyebrow">UM NOVO JEITO DE ORGANIZAR</div>
      <h1>
        Vamos fazer
        <br />
        essa conexão?
      </h1>
      <p className="auth-subtitle">Crie seu espaço e comece a organizar o negócio.</p>
      <AuthForm mode="register" />
    </AuthLayout>
  );
}
