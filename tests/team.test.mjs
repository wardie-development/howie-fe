import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const backendDir = fileURLToPath(new URL('../../howie/', import.meta.url));
const base = process.env.BASE_URL || 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('Local isolated preview only');
function shell(code, ...args) {
  return execFileSync(
    backendDir + 'venv/bin/python',
    [
      'manage.py',
      'shell',
      '--settings=core.portal_dev_settings',
      '-c',
      "import os,json,sys; sys.argv = ['manage.py'] + json.loads(os.environ['TEAM_TEST_ARGS']); " +
        code,
    ],
    {
      cwd: backendDir,
      stdio: 'pipe',
      env: { ...process.env, TEAM_TEST_ARGS: JSON.stringify(args) },
    },
  );
}
async function request(path, { method = 'GET', body, cookie, origin = new URL(base).origin } = {}) {
  const response = await fetch(base + path, {
    method,
    redirect: 'manual',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { origin } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    response,
    data: response.status === 204 ? null : await response.json().catch(() => null),
  };
}

test('Invitation BFF flow activates only after password, isolates company, and revokes access', async () => {
  const stamp = Date.now();
  const masterEmail = `team-owner-${stamp}@example.test`,
    invitedEmail = `team-guest-${stamp}@example.test`;
  const registration = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Master local',
      email: masterEmail,
      password: 'Secure-Master#4938',
      company_name: 'Equipe local',
    },
  });
  assert.equal(registration.response.status, 201, JSON.stringify(registration.data));
  assert.equal(registration.data.user.is_master, true);
  const cookie = registration.response.headers.get('set-cookie').split(';')[0];
  shell(
    'import sys; from apps.company.models import Company; Company.objects.filter(pk=int(sys.argv[-1])).update(portal_access="approved",legacy_portal_access=True)',
    String(registration.data.company.id),
  );
  const created = await request('/api/team', {
    method: 'POST',
    cookie,
    body: { name: 'Pessoa convidada', email: invitedEmail },
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.invitation.delivery_status, 'sent');
  assert.equal(created.data.invitation.status, 'pending');
  assert.ok(!('token' in created.data));
  assert.equal(
    (
      await request('/api/auth/login', {
        method: 'POST',
        body: { email: invitedEmail, password: 'Secure-Guest#7462' },
      })
    ).response.status,
    400,
  );
  // The local mail transport lives in the server process. Replace only this isolated
  // test invitation digest with a random known secret to exercise the public BFF.
  const token = randomBytes(32).toString('base64url'),
    digest = createHash('sha256').update(token).digest('hex');
  shell(
    'import sys; from apps.portal.models import CompanyInvitation; CompanyInvitation.objects.filter(pk=int(sys.argv[-2])).update(token_hash=sys.argv[-1])',
    String(created.data.invitation.id),
    digest,
  );
  const page = await fetch(base + '/aceitar-convite');
  const html = await page.text();
  assert.match(html, /noindex/);
  assert.doesNotMatch(html, new RegExp(token));
  const info = await request('/api/auth/invitation-info', { method: 'POST', body: { token } });
  assert.equal(info.response.status, 200);
  assert.match(info.response.headers.get('cache-control'), /no-store/);
  assert.equal(
    (
      await request('/api/auth/accept-invitation', {
        method: 'POST',
        origin: 'https://attacker.invalid',
        body: { token, password: 'Secure-Guest#7462' },
      })
    ).response.status,
    403,
  );
  assert.equal(
    (
      await request('/api/auth/accept-invitation', {
        method: 'POST',
        body: { token, password: '12345678' },
      })
    ).response.status,
    400,
  );
  const accepted = await request('/api/auth/accept-invitation', {
    method: 'POST',
    cookie,
    body: { token, password: 'Secure-Guest#7462' },
  });
  assert.equal(accepted.response.status, 200, JSON.stringify(accepted.data));
  assert.equal(accepted.response.headers.get('set-cookie'), null);
  assert.equal((await request('/api/auth/me', { cookie })).data.user.email, masterEmail);
  assert.equal(
    (
      await request('/api/auth/accept-invitation', {
        method: 'POST',
        body: { token, password: 'Secure-Guest#7462' },
      })
    ).response.status,
    400,
  );
  const login = await request('/api/auth/login', {
    method: 'POST',
    body: { email: invitedEmail, password: 'Secure-Guest#7462' },
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.data.company.id, registration.data.company.id);
  assert.equal(login.data.user.is_master, false);
  assert.ok(!('token' in login.data));
  const memberCookie = login.response.headers.get('set-cookie').split(';')[0];
  assert.match(login.response.headers.get('set-cookie'), /HttpOnly/i);
  assert.equal((await request('/api/team', { cookie: memberCookie })).response.status, 403);
  const team = await request('/api/team', { cookie });
  assert.equal(team.data.invitations.length, 0);
  const member = team.data.members.find((m) => m.email === invitedEmail);
  assert.equal(member.status, 'active');
  assert.equal(
    (
      await request(`/api/team/members/${member.id}`, {
        method: 'PATCH',
        cookie,
        body: { is_active: false },
      })
    ).response.status,
    200,
  );
  assert.equal((await request('/api/auth/me', { cookie: memberCookie })).response.status, 401);
});
