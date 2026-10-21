import test from 'node:test';
import assert from 'node:assert/strict';
import { facebookSDK, launchWhatsAppSignup } from '../src/lib/facebook-sdk.ts';

function browser() {
  const scripts = [];
  const target = {};
  const document = {
    createElement: () => ({
      remove() {
        this.removed = true;
      },
    }),
    head: { appendChild: (script) => scripts.push(script) },
  };
  return { scripts, target, document };
}

test('Meta bootstrap loading and window.FB stub do not release the login button', async () => {
  const { target, document, scripts } = browser();
  target.FB = {
    init() {
      throw Error('bootstrap must not be initialized');
    },
    login() {},
  };
  let ready = false;
  const first = facebookSDK(target, document);
  first.then(() => {
    ready = true;
  });
  assert.equal(facebookSDK(target, document), first);
  assert.equal(scripts.length, 1);
  scripts[0].onload?.();
  await Promise.resolve();
  assert.equal(ready, false);
  const realSDK = { init() {}, login() {} };
  target.FB = realSDK;
  target.fbAsyncInit();
  assert.equal(await first, realSDK);
  assert.equal(ready, true);
  assert.equal(await facebookSDK(target, document), realSDK);
  assert.equal(scripts.length, 1);
});

test('SDK load failure is visible and clears the pending loader', async () => {
  const { target, document, scripts } = browser();
  const pending = facebookSDK(target, document);
  scripts[0].onerror();
  await assert.rejects(pending, /Recarregue a página/);
  assert.equal(target.__betterFacebookSDK, undefined);
  assert.equal(scripts[0].removed, true);
});

test('Real SDK is initialized synchronously immediately before login', () => {
  const calls = [];
  const fb = {
    init: (args) => calls.push(['init', args]),
    login: (callback, args) => calls.push(['login', args, callback]),
  };
  const callback = () => {};
  launchWhatsAppSignup(
    fb,
    { app_id: '12345', config_id: '67890', graph_version: 'v21.0' },
    callback,
  );
  assert.deepEqual(
    calls.map((call) => call[0]),
    ['init', 'login'],
  );
  assert.equal(calls[0][1].version, 'v21.0');
  assert.equal(calls[1][1].config_id, '67890');
  assert.equal(calls[1][1].extras.featureType, 'whatsapp_business_app_onboarding');
  assert.equal(calls[1][2], callback);
});

test('Synchronous SDK errors propagate to the UI recovery handler', () => {
  let called = false;
  assert.throws(
    () =>
      launchWhatsAppSignup(
        {
          init() {
            throw Error('initialization failed');
          },
          login() {
            called = true;
          },
        },
        {},
        () => {},
      ),
    /initialization failed/,
  );
  assert.equal(called, false);
});
