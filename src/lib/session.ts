import 'server-only';
import { cookies } from 'next/headers';
import type { Profile } from './types';

export async function getSessionProfile(): Promise<Profile | null> {
  const token = (await cookies()).get('better_session')?.value;
  if (!token) return null;

  const backend = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
  const response = await fetch(`${backend.replace(/\/$/, '')}/api/v1/auth/me/`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error('Não foi possível carregar sua conta.');
  return response.json();
}
