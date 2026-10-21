import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const COOKIE = 'better_session';
async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part)))
    return NextResponse.json({ detail: 'Rota inválida.' }, { status: 400 });
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const allowed = [
      request.nextUrl.origin,
      ...(process.env.SITE_URL ? [new URL(process.env.SITE_URL).origin] : []),
    ];
    if (!origin || !allowed.includes(origin))
      return NextResponse.json({ detail: 'Origem inválida.' }, { status: 403 });
  }
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  const route = path.join('/');
  const backend = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(
      `${backend.replace(/\/$/, '')}/api/v1/${route}/${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
        cache: 'no-store',
        signal: AbortSignal.timeout(route === 'onboarding/whatsapp/complete' ? 55000 : 25000),
        redirect: 'manual',
      },
    );
    const body =
      response.status === 204
        ? null
        : await response.json().catch(() => ({ detail: 'Resposta inválida do servidor.' }));
    const login = route === 'auth/login' || route === 'auth/register';
    let session: { token: string; expires_in: number } | null = null;
    if (login && response.ok && body?.token) {
      session = { token: body.token, expires_in: body.expires_in };
      delete body.token;
      delete body.expires_in;
    }
    const result =
      response.status === 204
        ? new NextResponse(null, { status: 204 })
        : NextResponse.json(body, {
            status: response.status,
            headers: { 'Cache-Control': 'no-store' },
          });
    if (session)
      result.cookies.set(COOKIE, session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: session.expires_in,
      });
    if (route === 'auth/logout' || response.status === 401) result.cookies.delete(COOKIE);
    return result;
  } catch {
    return NextResponse.json(
      { detail: 'Não foi possível conectar à Better. Tente novamente em instantes.' },
      { status: 502 },
    );
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
