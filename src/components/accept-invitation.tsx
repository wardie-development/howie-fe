'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, LoaderCircle, ShieldCheck, Users } from 'lucide-react';
import { Brand } from './brand';
import { Notice } from './ui';
import { api, ApiError } from '@/lib/api';

type InvitationInfo = { name: string; email: string; company_name: string; expires_at: string };
export default function AcceptInvitation() {
  const parsed = useRef(false);
  const router = useRouter();
  const [token, setToken] = useState('');
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [infoFailed, setInfoFailed] = useState(false);
  useEffect(() => {
    if (parsed.current) return;
    parsed.current = true;
    const secret = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
    setToken(secret);
    if (!secret) {
      setLoading(false);
      setError(
        'Abra o link completo do e-mail de convite. Se ele expirou, peça um novo ao Master.',
      );
      return;
    }
    loadInfo(secret);
  }, []);
  async function loadInfo(secret: string) {
    setLoading(true);
    setError('');
    setInfoFailed(false);
    try {
      setInfo(
        await api<InvitationInfo>('auth/invitation-info/', {
          method: 'POST',
          body: JSON.stringify({ token: secret }),
        }),
      );
    } catch (err) {
      setInfoFailed(true);
      setError(err instanceof Error ? err.message : 'Não foi possível consultar o convite.');
    } finally {
      setLoading(false);
    }
  }
  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    if (form.get('password') !== form.get('password_confirmation')) {
      setError('As senhas precisam ser iguais.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('auth/accept-invitation/', {
        method: 'POST',
        body: JSON.stringify({ token, password: form.get('password') }),
      });
      setAccepted(true);
      setToken('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível aceitar o convite.');
    } finally {
      setBusy(false);
    }
  }
  async function signIn() {
    setBusy(true);
    setError('');
    try {
      // Switching accounts happens only after an explicit click, never upon opening the email.
      try {
        await api('auth/logout/', { method: 'POST' });
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) throw err;
      }
      router.push('/login');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível abrir o login.');
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
        <div className={`email-verify-illustration ${accepted ? 'confirmed' : ''}`}>
          <span>{accepted ? <Check size={38} /> : <Users size={38} strokeWidth={1.4} />}</span>
          <i>
            <ShieldCheck size={17} />
          </i>
        </div>
        <p className="eyebrow">{accepted ? 'TUDO PRONTO PARA COMEÇAR' : 'SEU LUGAR NA EQUIPE'}</p>
        <h1>
          {accepted ? (
            <>
              Convite aceito.
              <br />
              <span>Bem-vindo à equipe.</span>
            </>
          ) : (
            <>
              Boas-vindas,
              <br />
              <span>{info?.name || 'vamos começar?'}</span>
            </>
          )}
        </h1>
        <p className="email-verify-intro">
          {accepted ? (
            'Sua senha foi criada e seu acesso está ativo. Entre com o e-mail que recebeu este convite.'
          ) : info ? (
            <>
              Você foi convidado para <strong>{info.company_name}</strong>. Defina sua senha para
              participar.
            </>
          ) : (
            'Um convite para trabalhar em boa companhia.'
          )}
        </p>
        <section className="email-verify-card email-confirm-card">
          {error && (
            <>
              <Notice error message={error} />
              <Link className="text-link" href="/login">
                Já defini minha senha: ir para o login
              </Link>
            </>
          )}
          {loading ? (
            <LoaderCircle className="spin" aria-label="Verificando convite" />
          ) : accepted ? (
            <>
              <p className="email-confirm-success">
                <Check size={18} />
                Acesso ativado com segurança.
              </p>
              <button className="button primary" onClick={signIn} disabled={busy}>
                {busy ? 'Abrindo...' : 'Entrar com minha nova conta'}
              </button>
              <small>
                Se houver outra conta aberta neste navegador, ela será desconectada ao continuar.
              </small>
            </>
          ) : info ? (
            <form className="team-accept-form" onSubmit={accept}>
              <label>
                E-mail do convite
                <input type="email" value={info.email} readOnly autoComplete="username" />
              </label>
              <label>
                Crie sua senha
                <input
                  type="password"
                  name="password"
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  disabled={busy}
                />
              </label>
              <small>
                Use pelo menos 8 caracteres. Evite senhas comuns, apenas números ou parecidas com
                seu nome e e-mail.
              </small>
              <label>
                Confirme a senha
                <input
                  type="password"
                  name="password_confirmation"
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  disabled={busy}
                />
              </label>
              <button className="button primary" disabled={busy}>
                {busy ? <LoaderCircle size={17} className="spin" /> : <ShieldCheck size={17} />}
                {busy ? 'Ativando acesso...' : 'Definir senha e aceitar convite'}
              </button>
              <small>
                O convite é pessoal, tem uso único e vale por 24 horas. Você entrará como membro da
                equipe.
              </small>
            </form>
          ) : (
            <>
              {infoFailed && token && (
                <button className="button secondary" onClick={() => loadInfo(token)}>
                  Verificar novamente
                </button>
              )}
              <Link className="text-link" href="/login">
                Voltar para o login
              </Link>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
