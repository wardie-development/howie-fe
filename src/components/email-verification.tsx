'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  CircleHelp,
  Clock3,
  LoaderCircle,
  LogOut,
  MailCheck,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Brand } from './brand';
import type { EmailVerification } from '@/lib/types';

export function VerifyEmailGate({ initial }: { initial: EmailVerification }) {
  const router = useRouter();
  const [state, setState] = useState(initial),
    [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const wait = !now
    ? 60
    : Math.max(0, Math.ceil((new Date(state.resend_available_at).getTime() - now) / 1000));
  async function refresh() {
    try {
      const result = await api<{ verification: EmailVerification }>('auth/email-verification/');
      setState(result.verification);
      if (!result.verification.required) router.refresh();
      return result.verification.required;
    } catch {
      setError('Não conseguimos verificar sua confirmação. Tente novamente.');
    }
  }
  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 20000);
    const focus = () => refresh();
    window.addEventListener('focus', focus);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      window.removeEventListener('focus', focus);
    };
  }, []);
  async function checkConfirmation() {
    setBusy(true);
    setError('');
    setNotice('');
    const required = await refresh();
    if (required)
      setNotice(
        'Ainda não recebemos sua confirmação. Abra o link no e-mail e clique em Confirmar meu e-mail.',
      );
    setBusy(false);
  }
  async function resend() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api<{ verification: EmailVerification }>('auth/email-verification/', {
        method: 'POST',
        body: '{}',
      });
      setState(result.verification);
      setNotice('Um novo e-mail foi enviado. Confira sua caixa de entrada e a pasta de spam.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não conseguimos reenviar agora.');
      await refresh();
    } finally {
      setNow(Date.now());
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await api('auth/logout/', { method: 'POST' });
      window.location.assign('/login');
    } catch {
      setError('Não conseguimos sair. Tente novamente.');
      setBusy(false);
    }
  }
  return (
    <main className="onboarding-page email-verify-page">
      <header className="onboarding-top">
        <Brand />
        <button className="button ghost small" onClick={logout} disabled={busy}>
          <LogOut size={16} />
          Sair
        </button>
      </header>
      <div className="email-verify-wrap">
        <div className="email-verify-illustration">
          <span>
            <MailCheck size={38} strokeWidth={1.4} />
          </span>
          <i>
            <ShieldCheck size={17} />
          </i>
        </div>
        <p className="eyebrow">UM PASSO PARA CUIDAR DA SUA CONTA</p>
        <h1>
          Seu próximo passo
          <br />
          <span>está no seu e-mail.</span>
        </h1>
        <p className="email-verify-intro">
          Confirme seu endereço para continuar a ativação do seu espaço na Better.
        </p>
        <section className="email-verify-card">
          <div className="email-address">
            <Mail size={19} />
            <strong>{state.email}</strong>
          </div>
          <ol>
            <li>
              <span>1</span>Abra o e-mail enviado pela Better.
            </li>
            <li>
              <span>2</span>Acesse o link e confirme seu endereço.
            </li>
            <li>
              <span>3</span>Volte para continuar a ativação da sua conta.
            </li>
          </ol>
          <p className="email-verify-tip">
            <Clock3 size={16} />O link vale por 24 horas. Não encontrou? Confira também a pasta de
            spam.
          </p>
          {state.delivery_status === 'failed' && !error && (
            <p className="error-notice" role="alert">
              Não conseguimos enviar o e-mail. Você pode tentar novamente após o intervalo abaixo.
            </p>
          )}
          {error && (
            <p className="error-notice" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="success-notice" role="status">
              {notice}
            </p>
          )}
          <div className="email-verify-actions">
            <button className="button primary" onClick={checkConfirmation} disabled={busy}>
              <Check size={17} />
              Já confirmei meu e-mail
            </button>
            <button className="button secondary" onClick={resend} disabled={busy || wait > 0}>
              {busy ? <LoaderCircle size={16} className="spin" /> : <RefreshCw size={16} />}
              {wait > 0
                ? state.sends_remaining === 0
                  ? 'Limite diário atingido'
                  : `Reenviar em ${wait}s`
                : 'Reenviar e-mail'}
            </button>
          </div>
          <small className="email-verify-limits">
            Até 5 envios em 24 horas, com intervalo mínimo de 60 segundos.
            {state.sends_remaining === 0 && (
              <>
                {' '}
                Novo envio disponível em{' '}
                {new Intl.DateTimeFormat('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(new Date(state.resend_available_at))}
                .
              </>
            )}
          </small>
        </section>
        <p className="email-verify-support">
          <CircleHelp size={15} />
          Precisa de uma mão? <Link href="/app/suporte">Fale com a equipe Better</Link>
        </p>
      </div>
    </main>
  );
}

export function ConfirmEmail() {
  const parsed = useRef(false);
  const [token, setToken] = useState(''),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (parsed.current) return;
    parsed.current = true;
    // Fragments never reach the web server or referrer logs. Remove the secret from the address bar.
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    setToken(value);
    setReady(true);
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);
  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await api('auth/email-confirm/', { method: 'POST', body: JSON.stringify({ token }) });
      setConfirmed(true);
      setToken('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível confirmar seu e-mail.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="onboarding-page email-verify-page">
      <header className="onboarding-top">
        <Brand />
        <Link href="/fale-conosco" className="text-link">
          Preciso de ajuda
        </Link>
      </header>
      <div className="email-verify-wrap">
        <div className={`email-verify-illustration ${confirmed ? 'confirmed' : ''}`}>
          <span>{confirmed ? <Check size={38} /> : <MailCheck size={38} strokeWidth={1.4} />}</span>
          <i>
            <ShieldCheck size={17} />
          </i>
        </div>
        <p className="eyebrow">{confirmed ? 'TUDO CERTO POR AQUI' : 'BEM-VINDO À BETTER'}</p>
        <h1>
          {confirmed ? (
            <>
              E-mail confirmado.
              <br />
              <span>Vamos em frente?</span>
            </>
          ) : (
            <>
              Seu e-mail.
              <br />
              <span>Sua conta protegida.</span>
            </>
          )}
        </h1>
        <p className="email-verify-intro">
          {confirmed
            ? 'Seu endereço foi confirmado com sucesso. Agora você pode continuar a ativação da sua conta.'
            : 'Clique abaixo para confirmar seu endereço e dar o próximo passo na Better.'}
        </p>
        <section className="email-verify-card email-confirm-card">
          {error && (
            <p className="error-notice" role="alert">
              {error}
            </p>
          )}
          {!ready ? (
            <LoaderCircle className="spin" aria-label="Preparando confirmação" />
          ) : confirmed ? (
            <>
              <p className="email-confirm-success">
                <Check size={18} />
                Confirmação concluída com segurança.
              </p>
              <Link href="/app" className="button primary">
                Continuar para minha conta
                <ArrowRight size={17} />
              </Link>
              <small>Se necessário, entre com seu e-mail e senha.</small>
            </>
          ) : token ? (
            <>
              <button className="button primary" onClick={confirm} disabled={busy}>
                {busy ? <LoaderCircle size={17} className="spin" /> : <ShieldCheck size={17} />}
                {busy ? 'Confirmando...' : 'Confirmar meu e-mail'}
              </button>
              <small>
                Este link só confirma o endereço. Ele não conecta você automaticamente à conta.
              </small>
              {error && (
                <Link className="text-link" href="/app">
                  Entrar e solicitar outro link
                  <ArrowRight size={15} />
                </Link>
              )}
            </>
          ) : (
            <>
              <p>Não encontramos um link de confirmação válido nesta página.</p>
              <Link className="button primary" href="/app">
                Entrar e solicitar novo e-mail
                <ArrowRight size={17} />
              </Link>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
