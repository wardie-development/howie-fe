'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  CalendarDays,
  MessageCircle,
  CheckCheck,
  ArrowRight,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import { api, dateTime } from '@/lib/api';
import { PageHeader, Notice } from './ui';

type Notification = {
  id: number;
  kind: string;
  title: string;
  message: string;
  target: string;
  created_at: string;
  read_at: string | null;
};
type Inbox = { unread_count: number; next_before: number | null; results: Notification[] };
const changed = () => window.dispatchEvent(new Event('better-inbox-changed'));
async function read(item: Notification) {
  if (!item.read_at) await api(`notifications/${item.id}/read/`, { method: 'POST', body: '{}' });
  changed();
}
function NotificationIcon({ kind }: { kind: string }) {
  return kind === 'chat_created' ? <MessageCircle size={18} /> : <CalendarDays size={18} />;
}
export function NotificationBell() {
  const router = useRouter();
  const [data, setData] = useState<Inbox | null>(null),
    [open, setOpen] = useState(false),
    [error, setError] = useState(''),
    [marking, setMarking] = useState(false);
  const container = useRef<HTMLDivElement>(null),
    button = useRef<HTMLButtonElement>(null),
    inFlight = useRef(false),
    failures = useRef(0),
    nextAttempt = useRef(0);
  async function refresh(force = false) {
    if (
      inFlight.current ||
      document.visibilityState === 'hidden' ||
      (!force && Date.now() < nextAttempt.current)
    )
      return;
    inFlight.current = true;
    try {
      setData(await api<Inbox>('notifications/'));
      setError('');
      failures.current = 0;
      nextAttempt.current = 0;
    } catch {
      failures.current += 1;
      nextAttempt.current =
        Date.now() + Math.min(300000, 30000 * 2 ** Math.min(4, failures.current));
      setError('Não foi possível atualizar os avisos.');
    } finally {
      inFlight.current = false;
    }
  }
  useEffect(() => {
    let mounted = true;
    const tick = () => {
      if (mounted) void refresh();
    };
    tick();
    const timer = window.setInterval(tick, 30000);
    window.addEventListener('focus', tick);
    window.addEventListener('better-inbox-changed', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      mounted = false;
      clearInterval(timer);
      window.removeEventListener('focus', tick);
      window.removeEventListener('better-inbox-changed', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const pointer = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', pointer);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', pointer);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  async function visit(item: Notification) {
    try {
      await read(item);
    } catch {
      setError('Não foi possível marcar o aviso como lido.');
    }
    setOpen(false);
    router.push(item.target);
  }
  async function allRead() {
    if (!data?.results.length) return;
    setMarking(true);
    try {
      await api('notifications/read-all/', {
        method: 'POST',
        body: JSON.stringify({ through: data.results[0].id }),
      });
      changed();
    } catch {
      setError('Não foi possível marcar os avisos.');
    } finally {
      setMarking(false);
    }
  }
  return (
    <div className="notification-bell-wrap" ref={container}>
      <button
        ref={button}
        className={`notification-bell ${open ? 'open' : ''}`}
        aria-label={`Notificações${data?.unread_count ? `, ${data.unread_count} não lidas` : ''}`}
        aria-expanded={open}
        aria-controls="notification-popover"
        onClick={() => {
          setOpen(!open);
          if (!open) void refresh(true);
        }}
      >
        <Bell size={20} />
        {!!data?.unread_count && (
          <span className="notification-count">
            {data.unread_count > 99 ? '99+' : data.unread_count}
          </span>
        )}
      </button>
      {open && (
        <section
          id="notification-popover"
          className="notification-popover"
          aria-label="Suas notificações"
        >
          <div className="notification-popover-head">
            <div>
              <h2>Seu negócio em movimento</h2>
              <p>
                {data?.unread_count ? `${data.unread_count} avisos não lidos` : 'Você está em dia.'}
              </p>
            </div>
            <button
              className="icon-button"
              aria-label="Marcar notificações como lidas"
              disabled={!data?.unread_count || marking}
              onClick={allRead}
            >
              <CheckCheck size={18} />
            </button>
          </div>
          {error && (
            <div className="notification-fetch-error">
              <p role="alert">{error}</p>
              <button className="text-link" onClick={() => refresh(true)}>
                <RefreshCw size={14} />
                Tentar novamente
              </button>
            </div>
          )}
          {!data && !error ? (
            <div className="notification-empty">
              <LoaderCircle className="spin" size={22} />
              <p>Buscando seus avisos...</p>
            </div>
          ) : data && !data.results.length ? (
            <div className="notification-empty">
              <Bell size={28} />
              <strong>Os próximos acontecimentos chegam aqui.</strong>
              <p>Agendamentos e novas conversas, em um só lugar.</p>
            </div>
          ) : (
            <div className="notification-preview-list">
              {data?.results.slice(0, 6).map((item) => (
                <button
                  className={`notification-item ${item.read_at ? '' : 'unread'}`}
                  key={item.id}
                  onClick={() => visit(item)}
                >
                  <span
                    className={`notification-icon ${item.kind === 'chat_created' ? 'chat' : ''}`}
                  >
                    <NotificationIcon kind={item.kind} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <small>{dateTime(item.created_at)}</small>
                  </span>
                  {!item.read_at && <i aria-label="Não lida" />}
                </button>
              ))}
            </div>
          )}
          <Link
            className="notification-footer-link"
            href="/app/notificacoes"
            onClick={() => setOpen(false)}
          >
            Ver todas as notificações
            <ArrowRight size={16} />
          </Link>
        </section>
      )}
    </div>
  );
}
export default function Notifications() {
  const router = useRouter();
  const [data, setData] = useState<Inbox | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [unread, setUnread] = useState(false),
    [busy, setBusy] = useState(false);
  const loadVersion = useRef(0);
  async function load(append = false) {
    const version = ++loadVersion.current;
    setLoading(true);
    setError('');
    try {
      const page = await api<Inbox>(
        `notifications/?unread=${unread}${append && data?.next_before ? `&before=${data.next_before}` : ''}`,
      );
      if (version !== loadVersion.current) return;
      setData((current) =>
        append && current ? { ...page, results: [...current.results, ...page.results] } : page,
      );
    } catch (err) {
      if (version === loadVersion.current)
        setError(err instanceof Error ? err.message : 'Não foi possível carregar.');
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [unread]);
  async function visit(item: Notification) {
    try {
      await read(item);
    } catch {}
    router.push(item.target);
  }
  async function allRead() {
    if (!data?.results.length) return;
    setBusy(true);
    try {
      await api('notifications/read-all/', {
        method: 'POST',
        body: JSON.stringify({ through: data.results[0].id }),
      });
      changed();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="TUDO ACONTECE POR AQUI"
        title="Notificações da sua empresa."
        description="Acompanhe a agenda e as novas conversas, com uma leitura só sua."
      >
        <button
          className="button secondary"
          onClick={allRead}
          disabled={busy || !data?.unread_count}
        >
          <CheckCheck size={17} />
          Marcar todas como lidas
        </button>
      </PageHeader>
      <div className="catalog-toolbar">
        <div className="catalog-tabs">
          <button className={!unread ? 'active' : ''} onClick={() => setUnread(false)}>
            Todas
          </button>
          <button className={unread ? 'active' : ''} onClick={() => setUnread(true)}>
            Não lidas <span>{data?.unread_count || 0}</span>
          </button>
        </div>
        <button className="text-link" onClick={() => load()} disabled={loading}>
          <RefreshCw size={15} />
          Atualizar
        </button>
      </div>
      {error && <Notice error message={error} />}
      <section className="panel notification-center">
        {data?.results.map((item) => (
          <button
            className={`notification-item ${item.read_at ? '' : 'unread'}`}
            key={item.id}
            onClick={() => visit(item)}
          >
            <span className={`notification-icon ${item.kind === 'chat_created' ? 'chat' : ''}`}>
              <NotificationIcon kind={item.kind} />
            </span>
            <span>
              <strong>{item.title}</strong>
              <p>{item.message}</p>
              <small>
                {dateTime(item.created_at)} · {item.read_at ? 'Lida' : 'Não lida'}
              </small>
            </span>
            <ArrowRight size={18} />
          </button>
        ))}
        {!loading && !data?.results.length && (
          <div className="notification-empty">
            <Bell size={32} />
            <h2>{unread ? 'Tudo lido. Tudo em dia.' : 'Seus próximos avisos aparecerão aqui.'}</h2>
            <p>Quando chegar um agendamento ou uma nova conversa, você verá por aqui.</p>
          </div>
        )}
        {loading && (
          <div className="notification-empty" role="status">
            <LoaderCircle className="spin" size={23} />
            <p>Carregando avisos...</p>
          </div>
        )}
        {data?.next_before && !loading && (
          <button className="button secondary" onClick={() => load(true)}>
            Carregar mais
          </button>
        )}
      </section>
    </>
  );
}
