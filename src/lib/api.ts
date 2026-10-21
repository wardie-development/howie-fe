export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function errorMessage(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(errorMessage).join(' ');
  if (value && typeof value === 'object')
    return Object.entries(value)
      .map(
        ([key, val]) =>
          `${key === 'detail' || key === 'non_field_errors' ? '' : `${key}: `}${errorMessage(val)}`,
      )
      .join(' ');
  return 'Não foi possível concluir. Tente novamente.';
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/${path.replace(/^\//, '')}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    cache: 'no-store',
  });
  const body =
    response.status === 204
      ? null
      : await response
          .json()
          .catch(() => ({ detail: 'O serviço está temporariamente indisponível.' }));
  if (!response.ok) throw new ApiError(errorMessage(body), response.status);
  return body as T;
}
export async function list<T>(path: string): Promise<T[]> {
  const result = await api<{ results: T[]; next: string | null }>(path);
  let all = result.results;
  let next = result.next;
  let pages = 0;
  while (next && pages++ < 100) {
    const url = new URL(next, 'http://api.local');
    const clean = url.pathname.split('/api/v1/')[1];
    if (!clean) throw new Error('Paginação inválida.');
    const page = await api<{ results: T[]; next: string | null }>(clean + url.search);
    all = all.concat(page.results);
    next = page.next;
  }
  return all;
}
export const money = (value: string | number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Fortaleza',
  }).format(new Date(value));
