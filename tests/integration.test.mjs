import test from 'node:test';
import assert from 'node:assert/strict';

const base = process.env.BASE_URL || 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('Integration tests are restricted to the isolated localhost preview.');
const origin = new URL(base).origin;
async function request(path, { method = 'GET', body, cookie, requestOrigin = origin } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (method !== 'GET' && requestOrigin) headers.origin = requestOrigin;
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });
  let data = null;
  const content = response.headers.get('content-type') || '';
  if (content.includes('json')) data = await response.json();
  return { response, data };
}

test('Public Home is server-rendered, has SEO metadata, disabled pricing and an indexable sitemap', async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<h1>/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /name="description"/);
  assert.match(html, /aria-disabled="true"/);
  assert.match(html, /Em breve, solicite sua demonstração gratuita/);
  const robots = await (await fetch(base + '/robots.txt')).text();
  assert.match(robots, /Disallow: \/app/);
  const sitemap = await (await fetch(base + '/sitemap.xml')).text();
  assert.match(sitemap, /demonstracao/);
  assert.doesNotMatch(sitemap, /<loc>[^<]*\/app/);
});

test('Private pages require a session and the BFF rejects cross-site mutations', async () => {
  const { response } = await request('/app');
  assert.ok([307, 308].includes(response.status));
  assert.equal(response.headers.get('location'), '/login');
  const cross = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'demo@wardie.local', password: 'irrelevant' },
    requestOrigin: 'https://untrusted.invalid',
  });
  assert.equal(cross.response.status, 403);
  const missing = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'demo@wardie.local', password: 'irrelevant' },
    requestOrigin: null,
  });
  assert.equal(missing.response.status, 403);
});

test('End-to-end signup, HttpOnly session, tenant isolation, setup, booking and logout', async () => {
  const stamp = Date.now();
  const first = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Teste Local',
      company_name: `Teste local ${stamp}`,
      email: `local-${stamp}@example.test`,
      password: 'Demonstracao!872635',
    },
  });
  assert.equal(first.response.status, 201, JSON.stringify(first.data));
  assert.ok(!('token' in first.data));
  const setCookie = first.response.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=lax/i);
  const cookie = setCookie.split(';')[0];
  const me = await request('/api/auth/me', { cookie });
  assert.equal(me.response.status, 200);
  assert.equal(me.data.company.name, `Teste local ${stamp}`);
  for (const path of ['/login', '/cadastro']) {
    const guest = await request(path);
    assert.equal(guest.response.status, 200, path);
    const authenticated = await request(path, { cookie });
    assert.equal(authenticated.response.status, 307, path);
    assert.equal(authenticated.response.headers.get('location'), '/app');
    const invalid = await request(path, { cookie: 'better_session=invalid-session' });
    assert.equal(invalid.response.status, 200, path);
  }
  const service = await request('/api/services', {
    method: 'POST',
    cookie,
    body: { name: 'Serviço de teste', duration: 30, sell_price: '75.00' },
  });
  assert.equal(service.response.status, 201, JSON.stringify(service.data));
  const professional = await request('/api/professionals', {
    method: 'POST',
    cookie,
    body: { name: 'Profissional de teste' },
  });
  assert.equal(professional.response.status, 201);
  const client = await request('/api/clients', {
    method: 'POST',
    cookie,
    body: { name: 'Cliente de teste', phone: '5585000000000' },
  });
  assert.equal(client.response.status, 201);
  const offering = await request('/api/offerings', {
    method: 'POST',
    cookie,
    body: { professional: professional.data.id, service: service.data.id },
  });
  assert.equal(offering.response.status, 201);
  const date = new Date(Date.now() + 3 * 86400000);
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    new Date(`${parts}T12:00:00-03:00`).getUTCDay()
  ];
  const availability = await request('/api/availability', {
    method: 'POST',
    cookie,
    body: { professional: professional.data.id, weekday, start_time: '09:00', end_time: '18:00' },
  });
  assert.equal(availability.response.status, 201, JSON.stringify(availability.data));
  const payload = {
    professional_service: offering.data.id,
    client: client.data.id,
    starts_at: `${parts}T10:00:00-03:00`,
  };
  const booking = await request('/api/appointments', { method: 'POST', cookie, body: payload });
  assert.equal(booking.response.status, 201, JSON.stringify(booking.data));
  assert.equal(booking.data.client_name, 'Cliente de teste');
  assert.equal(booking.data.professional_name, 'Profissional de teste');
  assert.equal(booking.data.price, '75.00');
  const prefs = await request('/api/reminder-settings', { cookie });
  assert.equal(prefs.data.enabled, false);
  const enabled = await request('/api/reminder-settings', {
    method: 'PATCH',
    cookie,
    body: { enabled: true },
  });
  assert.equal(enabled.response.status, 200);
  const rules = await request('/api/reminder-rules', { cookie });
  assert.equal(rules.data.count, 1);
  const rule = rules.data.results[0];
  assert.equal(rule.minutes_before, 1440);
  const reminderList = await request(`/api/reminders?appointment=${booking.data.id}`, { cookie });
  assert.equal(reminderList.data.count, 1);
  const reminder = reminderList.data.results[0];
  assert.equal(new Date(booking.data.starts_at) - new Date(reminder.scheduled_at), 86400000);
  assert.equal(reminder.customized, false);
  const customized = await request(`/api/reminders/${reminder.id}`, {
    method: 'PATCH',
    cookie,
    body: { message: 'Olá, {nome}! Até amanhã.' },
  });
  assert.equal(customized.response.status, 200, JSON.stringify(customized.data));
  assert.equal(customized.data.customized, true);
  const changedRule = await request(`/api/reminder-rules/${rule.id}`, {
    method: 'PATCH',
    cookie,
    body: { message: 'Sua presença faz diferença, {nome}.' },
  });
  assert.equal(changedRule.response.status, 200);
  const applied = await request(`/api/reminder-rules/${rule.id}/apply`, {
    method: 'POST',
    cookie,
    body: {},
  });
  assert.equal(applied.data.updated, 0);
  const restored = await request(`/api/reminders/${reminder.id}/restore`, {
    method: 'POST',
    cookie,
    body: {},
  });
  assert.equal(restored.response.status, 200);
  assert.equal(restored.data.customized, false);
  assert.equal(restored.data.message, changedRule.data.message);
  const invalidVariable = await request(`/api/reminders/${reminder.id}`, {
    method: 'PATCH',
    cookie,
    body: { message: 'Olá {nome.__class__}' },
  });
  assert.equal(invalidVariable.response.status, 400);
  const consent = await request(`/api/clients/${client.data.id}`, {
    method: 'PATCH',
    cookie,
    body: { reminders_opt_in: true },
  });
  assert.equal(consent.response.status, 200);
  assert.ok(consent.data.reminders_opted_in_at);

  assert.equal(
    (await request('/api/appointments', { method: 'POST', cookie, body: payload })).response.status,
    400,
  );
  const range = await request(
    `/api/appointments?start=${encodeURIComponent(`${parts}T00:00:00-03:00`)}&end=${encodeURIComponent(`${parts}T23:59:59-03:00`)}`,
    { cookie },
  );
  assert.equal(range.data.count, 1);
  const other = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Outra Conta',
      company_name: 'Outro teste local',
      email: `other-${stamp}@example.test`,
      password: 'Demonstracao!687235',
    },
  });
  assert.equal(other.response.status, 201);
  const otherCookie = other.response.headers.get('set-cookie').split(';')[0];
  assert.equal(
    (await request(`/api/appointments/${booking.data.id}`, { cookie: otherCookie })).response
      .status,
    404,
  );
  assert.equal((await request('/api/services', { cookie: otherCookie })).data.count, 0);
  assert.equal(
    (await request(`/api/reminders/${reminder.id}`, { cookie: otherCookie })).response.status,
    404,
  );
  assert.equal((await request('/api/reminders', { cookie: otherCookie })).data.count, 0);

  assert.equal(
    (
      await request(`/api/appointments/${booking.data.id}/status`, {
        method: 'POST',
        cookie,
        body: { status: 'confirmed' },
      })
    ).response.status,
    200,
  );
  assert.equal(
    (
      await request(`/api/appointments/${booking.data.id}`, {
        method: 'PATCH',
        cookie,
        body: { starts_at: `${parts}T11:00:00-03:00` },
      })
    ).response.status,
    200,
  );
  assert.equal(
    (
      await request(`/api/appointments/${booking.data.id}/status`, {
        method: 'POST',
        cookie,
        body: { status: 'canceled' },
      })
    ).response.status,
    200,
  );
  assert.equal(
    (await request('/api/auth/logout', { method: 'POST', cookie, body: {} })).response.status,
    204,
  );
  assert.equal((await request('/api/auth/me', { cookie })).response.status, 401);
  for (const path of ['/login', '/cadastro']) {
    const revoked = await request(path, { cookie });
    assert.equal(revoked.response.status, 200, path);
  }
  await request('/api/auth/logout', { method: 'POST', cookie: otherCookie, body: {} });
});
