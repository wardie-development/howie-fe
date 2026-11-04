import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../howie/', import.meta.url));
const base = process.env.BASE_URL || 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('Local isolated preview only');
function shell(code, args) {
  return execFileSync(
    root + 'venv/bin/python',
    [
      'manage.py',
      'shell',
      '--settings=core.portal_dev_settings',
      '-c',
      "import os,json; values=json.loads(os.environ['UNIFIED_TEST_ARGS']); " + code,
    ],
    { cwd: root, stdio: 'pipe', env: { ...process.env, UNIFIED_TEST_ARGS: JSON.stringify(args) } },
  ).toString();
}
async function request(path, { method = 'GET', body, cookie, origin = new URL(base).origin } = {}) {
  const response = await fetch(base + path, {
    method,
    redirect: 'manual',
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
      ...(method !== 'GET' ? { origin } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    response,
    data: response.status === 204 ? null : await response.json().catch(() => null),
  };
}

test('Unified batch, contact fields and notification inbox work through the secure BFF', async () => {
  const stamp = Date.now();
  const registered = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Owner Local',
      company_name: 'Unified Local',
      email: `unified-${stamp}@example.test`,
      password: 'Unified-Secret#9327',
    },
  });
  assert.equal(registered.response.status, 201, JSON.stringify(registered.data));
  const cookie = registered.response.headers.get('set-cookie').split(';')[0];
  shell(
    'from apps.company.models import Company; Company.objects.filter(pk=values[0]).update(portal_access="approved",legacy_portal_access=True)',
    [registered.data.company.id],
  );
  const body = {
    request_id: randomUUID(),
    services: [
      { key: 'new-cut', name: 'Corte integrado', duration: 30, sell_price: '50.00' },
      { key: 'new-beard', name: 'Barba integrada', duration: 20, sell_price: '30.00' },
    ],
    professionals: [
      {
        name: 'Pessoa Um',
        phone: '(85) 99999-1111',
        email: 'person@example.test',
        user: registered.data.user.id,
        services: ['new-cut', 'new-beard'],
      },
      { name: 'Pessoa Dois', services: ['new-beard'] },
    ],
  };
  assert.equal(
    (
      await request('/api/catalog/setup', {
        method: 'POST',
        cookie,
        body,
        origin: 'https://attacker.invalid',
      })
    ).response.status,
    403,
  );
  const saved = await request('/api/catalog/setup', { method: 'POST', cookie, body });
  assert.equal(saved.response.status, 201, JSON.stringify(saved.data));
  assert.equal(
    (await request('/api/catalog/setup', { method: 'POST', cookie, body })).response.status,
    200,
  );
  const catalog = await request('/api/catalog', { cookie });
  assert.equal(catalog.data.professionals.length, 2);
  assert.equal(catalog.data.services.length, 2);
  const first = catalog.data.professionals.find((p) => p.name === 'Pessoa Um');
  assert.equal(first.services.length, 2);
  assert.equal(first.phone, '(85) 99999-1111');
  assert.equal(first.email, 'person@example.test');
  const weekly = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ].flatMap((weekday) => [
    { weekday, start_time: '09:00', end_time: '12:00' },
    { weekday, start_time: '13:00', end_time: '18:00' },
  ]);
  const hours = await request('/api/catalog/hours', {
    method: 'POST',
    cookie,
    body: {
      request_id: randomUUID(),
      professionals: catalog.data.professionals.map((p) => p.id),
      availability: weekly,
    },
  });
  assert.equal(hours.response.status, 200, JSON.stringify(hours.data));
  assert.equal(hours.data.updated, 2);
  const schedule = await request('/api/catalog/hours', { cookie });
  assert.ok(schedule.data.professionals.every((p) => p.availability.length === 14));
  const client = await request('/api/clients', {
    method: 'POST',
    cookie,
    body: { name: 'Cliente integrado', phone: `5585${String(stamp).slice(-9)}` },
  });
  const start = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) + 'T10:00:00-03:00';
  const booking = await request('/api/appointments', {
    method: 'POST',
    cookie,
    body: { professional_service: first.services[0].id, client: client.data.id, starts_at: start },
  });
  assert.equal(booking.response.status, 201, JSON.stringify(booking.data));
  let inbox = await request('/api/notifications', { cookie });
  assert.equal(inbox.response.status, 200);
  assert.equal(inbox.data.unread_count, 1);
  assert.equal(inbox.data.results[0].kind, 'appointment_created');
  assert.equal(inbox.data.results[0].target, `/app/agenda?appointment=${booking.data.id}`);
  assert.equal(
    (
      await request(`/api/notifications/${inbox.data.results[0].id}/read`, {
        method: 'POST',
        cookie,
        body: {},
      })
    ).response.status,
    200,
  );
  assert.equal((await request('/api/notifications', { cookie })).data.unread_count, 0);
  shell(
    'from apps.ia.models import AgentDefinition,Chat; from apps.services.models import Client; agent=AgentDefinition.objects.create(company_id=values[0],name="Local agent"); Chat.objects.create(agent_definition=agent,client=Client.objects.get(pk=values[1]))',
    [registered.data.company.id, client.data.id],
  );
  inbox = await request('/api/notifications', { cookie });
  assert.equal(inbox.data.unread_count, 1);
  assert.equal(inbox.data.results[0].kind, 'chat_created');
  assert.equal(inbox.data.results.length, 2);
  shell(
    'from apps.portal.models import NotificationEmail; assert NotificationEmail.objects.filter(event__company_id=values[0]).count()==1; assert NotificationEmail.objects.filter(event__company_id=values[0],status="pending").count()==1',
    [registered.data.company.id],
  );
  const legacy = await fetch(base + '/app/servicos', { headers: { cookie }, redirect: 'manual' });
  if ([307, 308].includes(legacy.status))
    assert.equal(legacy.headers.get('location'), '/app/profissionais');
  else {
    assert.equal(legacy.status, 200);
    assert.match(
      await legacy.text(),
      /NEXT_REDIRECT[^<]*app\/profissionais|url=\/app\/profissionais/,
    );
  }
});
