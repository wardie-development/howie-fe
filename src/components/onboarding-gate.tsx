'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Clock3,
  LogOut,
  MessageCircle,
  ShieldCheck,
  ArrowRight,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import { Brand } from './brand';
import { api, ApiError } from '@/lib/api';
import type { Profile, Onboarding } from '@/lib/types';

type Launch = { attempt: string; app_id: string; config_id: string; graph_version: string };
type Facebook = {
  init: (options: Record<string, unknown>) => void;
  login: (
    callback: (response: { authResponse?: { code?: string } }) => void,
    options: Record<string, unknown>,
  ) => void;
};
declare global {
  interface Window {
    FB?: Facebook;
  }
}
let sdkPromise: Promise<Facebook> | undefined;
function facebookSDK(): Promise<Facebook> {
  if (window.FB) return Promise.resolve(window.FB);
  if (!sdkPromise)
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/pt_BR/sdk.js';
      script.async = true;
      const fail = () => {
        clearTimeout(timer);
        sdkPromise = undefined;
        script.remove();
        reject(
          new Error(
            'Não foi possível carregar a conexão da Meta. Verifique sua conexão e tente novamente.',
          ),
        );
      };
      const timer = setTimeout(fail, 20000);
      script.onload = () => {
        clearTimeout(timer);
        if (window.FB) resolve(window.FB);
        else fail();
      };
      script.onerror = fail;
      document.head.appendChild(script);
    });
  return sdkPromise;
}

export default function OnboardingGate({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<Onboarding>(
    profile.onboarding || {
      stage: 'pending',
      can_use_panel: false,
      whatsapp_connected: false,
      phone_number: null,
    },
  );
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [retry, setRetry] = useState(0);
  const flow = useRef<{
    launch: Launch;
    code?: string;
    waba_id?: string;
    phone_number_id?: string;
    sending?: boolean;
  } | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function refresh() {
    setRefreshing(true);
    try {
      const result = await api<Onboarding & { signup_available: boolean }>('onboarding/');
      setState(result);
      setAvailable(result.signup_available);
      setError('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        window.location.assign('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar sua conta.');
    } finally {
      setRefreshing(false);
    }
  }
  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 30000);
    const focus = () => refresh();
    window.addEventListener('focus', focus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', focus);
    };
  }, []);
  useEffect(() => {
    if (profile.onboarding) setState(profile.onboarding);
  }, [profile.onboarding]);
  useEffect(() => {
    if (state.stage !== 'whatsapp' || !available) return;
    let canceled = false;
    setLaunch(null);
    Promise.all([
      facebookSDK(),
      api<Launch>('onboarding/whatsapp/begin/', { method: 'POST', body: '{}' }),
    ])
      .then(([fb, prepared]) => {
        if (canceled) return;
        fb.init({
          appId: prepared.app_id,
          version: prepared.graph_version,
          xfbml: false,
          cookie: false,
        });
        setLaunch(prepared);
      })
      .catch((err) => {
        if (!canceled)
          setError(err instanceof Error ? err.message : 'Não foi possível preparar a conexão.');
      });
    const expiry = setTimeout(
      () => {
        if (!canceled) setRetry((v) => v + 1);
      },
      9 * 60 * 1000,
    );
    return () => {
      canceled = true;
      clearTimeout(expiry);
    };
  }, [state.stage, available, retry]);

  async function finish() {
    const current = flow.current;
    if (
      !current ||
      !current.code ||
      !current.waba_id ||
      !current.phone_number_id ||
      current.sending
    )
      return;
    current.sending = true;
    setProcessing(true);
    if (timeout.current) clearTimeout(timeout.current);
    try {
      const result = await api<Profile>('onboarding/whatsapp/complete/', {
        method: 'POST',
        body: JSON.stringify({
          attempt: current.launch.attempt,
          code: current.code,
          waba_id: current.waba_id,
          phone_number_id: current.phone_number_id,
        }),
      });
      flow.current = null;
      setState(result.onboarding);
      router.replace('/app/agentes');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir a conexão.');
      flow.current = null;
      setLaunch(null);
    } finally {
      setBusy(false);
      setProcessing(false);
    }
  }
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        !['https://www.facebook.com', 'https://web.facebook.com'].includes(event.origin) ||
        !flow.current
      )
        return;
      let data;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (!data || data.type !== 'WA_EMBEDDED_SIGNUP') return;
      if (['FINISH', 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'].includes(data.event)) {
        if (
          typeof data.data?.waba_id !== 'string' ||
          typeof data.data?.phone_number_id !== 'string'
        )
          return;
        Object.assign(flow.current, {
          waba_id: data.data.waba_id,
          phone_number_id: data.data.phone_number_id,
        });
        finish();
      } else if (['CANCEL', 'ERROR'].includes(data.event) && !flow.current.sending) {
        flow.current = null;
        setBusy(false);
        setError('A conexão não foi concluída. Você pode tentar novamente quando quiser.');
      }
    };
    window.addEventListener('message', receive);
    return () => {
      window.removeEventListener('message', receive);
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  function connect() {
    if (!launch || !window.FB) return;
    setError('');
    setBusy(true);
    flow.current = { launch };
    // Keep FB.login synchronous with the click so browsers allow its popup.
    window.FB.login(
      (response) => {
        if (!flow.current) return;
        if (response.authResponse?.code) {
          flow.current.code = response.authResponse.code;
          finish();
        } else if (!flow.current.sending) {
          flow.current = null;
          setBusy(false);
          setError('A autorização não foi concluída. Tente novamente.');
        }
      },
      {
        config_id: launch.config_id,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          version: 'v4',
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
        },
      },
    );
    timeout.current = setTimeout(
      () => {
        if (flow.current && !flow.current.sending) {
          flow.current = null;
          setBusy(false);
          setError('Esta tentativa expirou. Inicie a conexão novamente.');
          setLaunch(null);
        }
      },
      8 * 60 * 1000,
    );
  }
  async function logout() {
    setBusy(true);
    try {
      await api('auth/logout/', { method: 'POST', body: '{}' });
      window.location.assign('/login');
    } catch {
      setError('Não foi possível sair. Tente novamente.');
      setBusy(false);
    }
  }
  if (state.stage === 'ready') return children;
  const waiting = state.stage === 'pending';
  const suspended = state.stage === 'suspended';
  return (
    <main className="onboarding-page">
      <header className="onboarding-top">
        <Brand />
        <button className="button ghost small" disabled={busy} onClick={logout}>
          <LogOut size={16} /> Sair
        </button>
      </header>
      <div className="onboarding-wrap">
        <p className="eyebrow">BEM-VINDO AO BETTER</p>
        <h1>
          Seu próximo passo
          <br />
          <span>para atender melhor.</span>
        </h1>
        <p className="onboarding-intro">
          {profile.user.name.split(' ')[0]}, estamos preparando o espaço de {profile.company.name}.
        </p>
        <ol className="onboarding-steps" aria-label="Etapas de ativação">
          {[
            ['Aprovação', ShieldCheck],
            ['WhatsApp', MessageCircle],
            ['Seu agente', Check],
          ].map(([label, Icon], index) => {
            const StepIcon = Icon as typeof Check;
            const done = !waiting && !suspended && index === 0;
            return (
              <li
                key={String(label)}
                className={
                  done ? 'done' : index === (waiting || suspended ? 0 : 1) ? 'current' : ''
                }
              >
                <span>{done ? <Check size={17} /> : <StepIcon size={17} />}</span>
                {String(label)}
              </li>
            );
          })}
        </ol>
        <section className="onboarding-card" aria-live="polite">
          <div className="onboarding-symbol">
            {waiting ? (
              <Clock3 size={29} />
            ) : suspended ? (
              <ShieldCheck size={29} />
            ) : (
              <MessageCircle size={29} />
            )}
          </div>
          <h2>
            {waiting
              ? 'Cadastro recebido. Agora é com a gente.'
              : suspended
                ? 'Seu acesso está pausado.'
                : 'Vamos conectar seu WhatsApp?'}
          </h2>
          <p>
            {waiting
              ? 'Nossa equipe vai analisar seu cadastro. Assim que ele for aprovado, este espaço será liberado para você conectar seu número.'
              : suspended
                ? 'Entre em contato com a equipe Better para saber como retomar seu acesso.'
                : 'Conecte o número do seu negócio pelo ambiente seguro da Meta. Você poderá continuar usando o WhatsApp Business no celular.'}
          </p>
          {!waiting && !suspended && (
            <div className="onboarding-note">
              <ShieldCheck size={19} />
              <span>
                Depois de concluir a conexão, você poderá criar seu agente e explorar agenda,
                serviços, lembretes e financeiro.
              </span>
            </div>
          )}
          {error && (
            <div className="error-notice" role="alert">
              {error}
            </div>
          )}
          {waiting || suspended ? (
            <button className="button secondary" onClick={refresh} disabled={refreshing}>
              <RefreshCw size={17} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Verificando...' : 'Verificar meu acesso'}
            </button>
          ) : (
            <>
              {available ? (
                <button
                  className="button primary"
                  onClick={
                    launch
                      ? connect
                      : () => {
                          setError('');
                          setRetry((v) => v + 1);
                        }
                  }
                  disabled={busy || (!launch && !error)}
                >
                  {busy || (!launch && !error) ? (
                    <LoaderCircle size={18} className="spin" />
                  ) : (
                    <MessageCircle size={18} />
                  )}
                  {busy
                    ? processing
                      ? 'Confirmando conexão...'
                      : 'Conclua a autorização na Meta'
                    : launch
                      ? 'Conectar meu WhatsApp'
                      : error
                        ? 'Preparar nova tentativa'
                        : 'Preparando conexão...'}
                  {launch && !busy && <ArrowRight size={18} />}
                </button>
              ) : (
                <>
                  <div className="onboarding-note">
                    Seu cadastro está aprovado. Estamos preparando a conexão automática do seu
                    WhatsApp.
                  </div>
                  <button className="button primary" disabled>
                    <MessageCircle size={18} /> Conectar meu WhatsApp
                  </button>
                </>
              )}
              {busy && (
                <button
                  className="button ghost small"
                  disabled={processing}
                  onClick={() => {
                    flow.current = null;
                    if (timeout.current) clearTimeout(timeout.current);
                    setBusy(false);
                    setLaunch(null);
                    setRetry((v) => v + 1);
                  }}
                >
                  Cancelar tentativa
                </button>
              )}
              <small>
                Use uma conta da Meta com permissão para administrar o WhatsApp do seu negócio.
              </small>
            </>
          )}
        </section>
        <p className="onboarding-support">
          Precisa de uma mão? <a href="/demonstracao">Fale com a equipe Better</a>
        </p>
      </div>
    </main>
  );
}
