import type { Metadata } from 'next';
import AuthForm from '@/components/auth-form';
import AuthLayout from '@/components/auth-layout';
export const metadata: Metadata = {
  title: 'Entrar',
  robots: { index: false, follow: false },
  alternates: { canonical: '/login' },
};
export default function Login() {
  return (
    <AuthLayout>
      <div className="eyebrow">BOM TER VOCÊ POR AQUI</div>
      <h1>
        Seu próximo
        <br />
        bom dia começa aqui.
      </h1>
      <p className="auth-subtitle">Entre para acompanhar seu negócio.</p>
      <AuthForm mode="login" />
    </AuthLayout>
  );
}
