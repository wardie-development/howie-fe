export type Facebook = {
  init: (options: Record<string, unknown>) => void;
  login: (
    callback: (response: { authResponse?: { code?: string } }) => void,
    options: Record<string, unknown>,
  ) => void;
};

type SDKWindow = {
  FB?: Facebook;
  fbAsyncInit?: () => void;
  __betterFacebookSDK?: Promise<Facebook>;
};

declare global {
  interface Window extends SDKWindow {}
}

// sdk.js first installs a stub, then downloads the real SDK separately. Its
// script load event and the mere presence of window.FB do not mean it is ready.
export function facebookSDK(
  target: SDKWindow = window,
  doc: Pick<Document, 'createElement' | 'head'> = document,
): Promise<Facebook> {
  if (target.__betterFacebookSDK) return target.__betterFacebookSDK;
  target.__betterFacebookSDK = new Promise<Facebook>((resolve, reject) => {
    const previous = target.fbAsyncInit;
    const script = doc.createElement('script');
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      target.__betterFacebookSDK = undefined;
      target.fbAsyncInit = previous;
      script.remove();
      reject(
        new Error(
          'Não foi possível carregar a conexão da Meta. Recarregue a página e verifique se um bloqueador de conteúdo está impedindo a conexão.',
        ),
      );
    };
    const timer = setTimeout(fail, 20000);
    target.fbAsyncInit = () => {
      if (settled) return;
      if (!target.FB) {
        fail();
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(target.FB);
      previous?.();
    };
    script.src = 'https://connect.facebook.net/pt_BR/sdk.js';
    script.async = true;
    script.onerror = fail;
    doc.head.appendChild(script);
  });
  return target.__betterFacebookSDK;
}

// Initialization and login must happen in the same user click with the real SDK.
// This also recovers when another integration has changed FB's runtime options.
export function launchWhatsAppSignup(
  fb: Facebook,
  config: { app_id: string; graph_version: string; config_id: string },
  callback: Parameters<Facebook['login']>[0],
) {
  fb.init({ appId: config.app_id, version: config.graph_version, xfbml: false, cookie: false });
  fb.login(callback, {
    config_id: config.config_id,
    response_type: 'code',
    override_default_response_type: true,
    extras: {
      version: 'v4',
      featureType: 'whatsapp_business_app_onboarding',
      sessionInfoVersion: '3',
    },
  });
}
