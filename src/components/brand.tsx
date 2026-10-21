import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${light ? 'brand-light' : ''}`}
      aria-label="Better, página inicial"
    >
      <span className="brand-mark">
        <span />
        <span />
        <span />
      </span>
      better<span className="brand-dot">.</span>
    </Link>
  );
}
export function PublicNav() {
  return (
    <header className="public-nav">
      <div className="public-nav-inner">
        <Brand light />
        <nav aria-label="Principal">
          <Link href="/#como-funciona">Como funciona</Link>
          <Link href="/#recursos">Recursos</Link>
          <span className="pricing-item" tabIndex={0} aria-disabled="true">
            Preços <small>Em breve</small>
            <span className="pricing-tip">Em breve, solicite sua demonstração gratuita</span>
          </span>
        </nav>
        <div className="nav-actions">
          <Link className="nav-login" href="/login">
            Entrar
          </Link>
          <Link className="button yellow small" href="/demonstracao">
            Agendar demonstração <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}
export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div>
        <Brand light />
        <p>Mais tempo para o que só você pode fazer.</p>
      </div>
      <div>
        <Link href="/privacidade">Privacidade</Link>
        <Link href="/termos">Termos de uso</Link>
        <span>© {new Date().getFullYear()} Better</span>
      </div>
    </footer>
  );
}
