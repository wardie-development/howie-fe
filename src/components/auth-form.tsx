'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LoaderCircle, Check } from 'lucide-react';
import { api } from '@/lib/api';

export default function AuthForm({ mode }: { mode: 'login' | 'register' | 'demo' }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [show, setShow] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === 'demo') {
        const result = await api<{ detail: string }>('demo/', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        setSuccess(result.detail);
      } else {
        await api(`auth/${mode}/`, { method: 'POST', body: JSON.stringify(data) });
        router.replace('/app');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível continuar.');
    } finally {
      setBusy(false);
    }
  }
  if (success)
    return (
      <div className="success-state" role="status">
        <span className="success-icon">
          <Check size={30} />
        </span>
        <h2>Vamos conversar!</h2>
        <p>{success}</p>
        <Link className="button primary" href="/">
          Voltar para a Home <ArrowRight size={17} />
        </Link>
      </div>
    );
  return (
    <form className="auth-form" onSubmit={submit}>
      {mode !== 'login' && (
        <label>
          Seu nome
          <input
            name="name"
            autoComplete="name"
            placeholder="Como podemos chamar você?"
            required
            maxLength={150}
          />
        </label>
      )}
      {mode !== 'login' && (
        <label>
          Nome do seu negócio
          <input
            name="company_name"
            autoComplete="organization"
            placeholder="Ex.: Studio Aurora"
            required
            maxLength={255}
          />
        </label>
      )}
      <label>
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@seunegocio.com.br"
          required
          maxLength={150}
        />
      </label>
      {mode === 'demo' ? (
        <>
          <label>
            WhatsApp
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="55 85 99999-9999"
              required
              maxLength={20}
            />
          </label>
          <label>
            O que você gostaria de organizar? <span className="optional">Opcional</span>
            <textarea
              name="message"
              placeholder="Conte um pouco sobre o seu negócio."
              rows={3}
              maxLength={2000}
            />
          </label>
        </>
      ) : (
        <label>
          Senha
          <div className="password-field">
            <input
              name="password"
              type={show ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={
                mode === 'register' ? 'Crie uma senha com pelo menos 8 caracteres' : 'Sua senha'
              }
              minLength={mode === 'register' ? 8 : undefined}
              maxLength={128}
              required
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {mode === 'register' && (
            <small className="field-hint">Use uma senha exclusiva, com letras e números.</small>
          )}
        </label>
      )}
      {mode === 'register' && (
        <label className="checkbox-label">
          <input name="terms" type="checkbox" required />
          <span>
            Li e concordo com os <Link href="/termos">Termos de uso</Link> e a{' '}
            <Link href="/privacidade">Política de privacidade</Link>.
          </span>
        </label>
      )}
      {error && (
        <div className="error-notice" role="alert">
          {error}
        </div>
      )}
      <button className="button primary full" type="submit" disabled={busy}>
        {busy ? (
          <LoaderCircle className="spin" size={19} />
        ) : mode === 'login' ? (
          'Entrar na minha conta'
        ) : mode === 'register' ? (
          'Criar minha conta'
        ) : (
          'Solicitar demonstração gratuita'
        )}
        {!busy && <ArrowRight size={18} />}
      </button>
      {mode === 'demo' && (
        <p className="form-footnote">
          Usaremos seus dados para responder à solicitação. Consulte nossa{' '}
          <Link href="/privacidade">Política de privacidade</Link>.
        </p>
      )}
      {mode !== 'demo' && (
        <p className="auth-switch">
          {mode === 'login' ? 'Ainda não tem uma conta? ' : 'Já tem uma conta? '}
          <Link href={mode === 'login' ? '/cadastro' : '/login'}>
            {mode === 'login' ? 'Comece por aqui' : 'Entre aqui'}
          </Link>
        </p>
      )}
    </form>
  );
}
