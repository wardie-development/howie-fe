import { Brand } from './brand';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Sparkles, MessageCircle } from 'lucide-react';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-layout">
      <section className="auth-aside">
        <Brand light />
        <div className="auth-aside-copy">
          <span className="eyebrow light">MENOS CORRERIA. MAIS CONEXÃO.</span>
          <h2>
            Seu negócio
            <br />
            tem muito
            <br />a <span>conversar.</span>
          </h2>
          <p>
            Atendimento, serviços e agenda.
            <br />
            Tudo no mesmo ritmo.
          </p>
          <div className="auth-pictograms">
            <span>
              <MessageCircle />
            </span>
            <i />
            <span>
              <Sparkles />
            </span>
            <i />
            <span>
              <CalendarDays />
            </span>
          </div>
        </div>
        <small>Mais tempo para o que só você pode fazer.</small>
      </section>
      <section className="auth-main">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} /> Voltar para a Home
        </Link>
        <div className="auth-form-container">{children}</div>
        <div className="auth-bottom">
          <span>Better © {new Date().getFullYear()}</span>
          <Link href="/privacidade">Privacidade</Link>
        </div>
      </section>
    </main>
  );
}
