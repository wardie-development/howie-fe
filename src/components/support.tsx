'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCheck,
  CircleHelp,
  Clock3,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  Ticket,
} from 'lucide-react';
import { api, dateTime } from '@/lib/api';
import { EmptyState, ErrorState, Loading, Modal, Notice, PageHeader, useLoad } from './ui';

type Status = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
type Update = {
  id: number;
  kind: 'created' | 'reply' | 'status_changed';
  message: string;
  actor_name: string;
  actor_role: 'customer' | 'support';
  previous_status: Status | '';
  status: Status;
  created_at: string;
};
type SupportTicket = {
  code: string;
  subject: string;
  category: string;
  category_label: string;
  status: Status;
  status_label: string;
  contact_email: string;
  created_at: string;
  updated_at: string;
  events: Update[];
};
type TicketPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: SupportTicket[];
};
const statuses: Record<Status, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  waiting_customer: 'Aguardando você',
  resolved: 'Resolvido',
  closed: 'Encerrado',
};
const categories = {
  general: 'Dúvidas gerais',
  technical: 'Problema técnico',
  whatsapp: 'Conexão com WhatsApp',
  billing: 'Financeiro',
  suggestion: 'Sugestão',
};
function Badge({ status }: { status: Status }) {
  return (
    <span className={`support-badge ${status}`}>
      <span />
      {statuses[status]}
    </span>
  );
}
function useRefresh(reload: () => void, key: string) {
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, 30000);
    return () => clearInterval(interval);
    // reload uses a functional state update and remains safe across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
export default function Support({ code }: { code?: string }) {
  return code ? <TicketThread key={code} code={code} /> : <TicketList />;
}
function TicketList() {
  const router = useRouter();
  const [creating, setCreating] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [status, setStatus] = useState(''),
    [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), status, search: query });
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useLoad(() => api<TicketPage>(`support-tickets/?${params}`), [page, status, query]);
  useRefresh(reload, `${page}/${status}/${query}`);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api<SupportTicket>('support-tickets/', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
      });
      router.push(`/app/suporte/${result.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível abrir o chamado.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="ESTAMOS POR PERTO"
        title="Fale com a gente."
        description="Abra um chamado e acompanhe cada passo da solução, em um só lugar."
      >
        <button
          className="button primary"
          onClick={() => {
            setError('');
            setCreating(true);
          }}
        >
          <Plus size={18} />
          Novo chamado
        </button>
      </PageHeader>
      <section className="support-welcome">
        <span className="support-welcome-icon">
          <MessageCircle size={27} />
        </span>
        <div>
          <h2>Uma conversa que não se perde.</h2>
          <p>
            Dúvidas, dificuldades ou uma boa ideia? Conte com a equipe Better. Seu chamado ganha um
            código e um histórico para você consultar quando precisar.
          </p>
        </div>
        <span className="support-welcome-note">
          <Clock3 size={16} />
          Acompanhe as respostas por aqui
        </span>
      </section>
      <section className="panel support-panel">
        <div className="support-toolbar">
          <div>
            <h2>Seus chamados</h2>
            <p>
              {data
                ? `${data.count} ${data.count === 1 ? 'chamado encontrado' : 'chamados encontrados'}`
                : 'Seu histórico com a equipe Better'}
            </p>
          </div>
          <form
            className="support-filters"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setQuery(search);
            }}
          >
            <input
              aria-label="Buscar por assunto ou código"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Assunto ou código"
              maxLength={160}
              type="search"
            />
            <button className="button secondary small" type="submit">
              Buscar
            </button>
            <select
              aria-label="Filtrar por status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os status</option>
              {Object.entries(statuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </form>
        </div>
        {loadError ? (
          <ErrorState message={loadError} retry={reload} />
        ) : loading && !data ? (
          <Loading />
        ) : data?.results.length ? (
          <>
            <div className="support-list" aria-busy={loading}>
              {data.results.map((ticket) => (
                <Link
                  className="support-list-item"
                  key={ticket.code}
                  href={`/app/suporte/${ticket.code}`}
                >
                  <span className="support-ticket-icon">
                    <Ticket size={21} />
                  </span>
                  <div className="support-subject">
                    <small>
                      {ticket.code} <span>· {ticket.category_label}</span>
                    </small>
                    <h3>{ticket.subject}</h3>
                    <span>Atualizado em {dateTime(ticket.updated_at)}</span>
                  </div>
                  <Badge status={ticket.status} />
                  <ArrowUpRight className="support-list-arrow" size={19} />
                </Link>
              ))}
            </div>
            {(data.previous || data.next) && (
              <div className="support-pagination">
                <button
                  className="button secondary small"
                  disabled={!data.previous || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </button>
                <span>Página {page}</span>
                <button
                  className="button secondary small"
                  disabled={!data.next || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={CircleHelp}
            title={status || query ? 'Nenhum chamado encontrado.' : 'Como podemos ajudar?'}
            description={
              status || query
                ? 'Experimente outro código, assunto ou status.'
                : 'Abra seu primeiro chamado. Nossa conversa e as próximas atualizações ficam salvas aqui.'
            }
          />
        )}
      </section>
      {creating && (
        <Modal
          title="Como podemos ajudar?"
          description="Quanto mais detalhes, mais fácil encontrar uma solução."
          onClose={() => {
            if (!busy) setCreating(false);
          }}
        >
          <form className="support-form" onSubmit={create}>
            <label>
              Assunto
              <input
                autoFocus
                name="subject"
                placeholder="Resuma o que você precisa"
                required
                maxLength={160}
              />
            </label>
            <label>
              Sobre o que vamos conversar?
              <select name="category">
                {Object.entries(categories).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sua mensagem
              <textarea
                name="message"
                placeholder="Conte o que aconteceu e como podemos ajudar. Evite enviar senhas ou chaves de acesso."
                required
                maxLength={8000}
                rows={6}
              />
            </label>
            {error && <Notice error message={error} />}
            <div className="support-form-footer">
              <span>Você poderá acompanhar e responder pelo painel.</span>
              <button className="button primary" disabled={busy}>
                {busy ? 'Abrindo...' : 'Abrir chamado'}
                <ArrowUpRight size={17} />
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function TicketThread({ code }: { code: string }) {
  const { data, error, loading, reload } = useLoad(
    () => api<SupportTicket>(`support-tickets/${encodeURIComponent(code)}/`),
    [code],
  );
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(''),
    [notice, setNotice] = useState('');
  useRefresh(reload, code);
  async function change(action: 'reply' | 'close' | 'reopen') {
    setBusy(true);
    setActionError('');
    setNotice('');
    try {
      await api(`support-tickets/${encodeURIComponent(code)}/${action}/`, {
        method: 'POST',
        body: JSON.stringify(action === 'reply' ? { message } : {}),
      });
      if (action === 'reply') setMessage('');
      setNotice(
        action === 'reply'
          ? 'Mensagem enviada.'
          : action === 'close'
            ? 'Chamado encerrado. Você pode reabri-lo quando precisar.'
            : 'Chamado reaberto.',
      );
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível atualizar o chamado.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link href="/app/suporte" className="back-link">
        <ArrowLeft size={16} />
        Todos os chamados
      </Link>
      {error ? (
        <ErrorState message={error} retry={reload} />
      ) : loading && !data ? (
        <Loading />
      ) : (
        data && (
          <>
            <PageHeader
              eyebrow={data.code}
              title={data.subject}
              description={`${data.category_label} · Aberto em ${dateTime(data.created_at)}`}
            >
              <button
                className="button secondary small"
                disabled={busy}
                onClick={() =>
                  change(
                    data.status === 'closed' || data.status === 'resolved' ? 'reopen' : 'close',
                  )
                }
              >
                {data.status === 'closed' || data.status === 'resolved' ? (
                  <RefreshCw size={16} />
                ) : (
                  <CheckCheck size={16} />
                )}
                {data.status === 'closed' || data.status === 'resolved'
                  ? 'Reabrir chamado'
                  : 'Encerrar chamado'}
              </button>
            </PageHeader>
            <div className="support-thread-layout">
              <section className="panel support-thread">
                <div className="support-thread-head">
                  <div>
                    <h2>Conversa com a Better</h2>
                    <p>Todo o acompanhamento fica registrado aqui.</p>
                  </div>
                  <Badge status={data.status} />
                </div>
                <ol className="support-messages" aria-label="Histórico do chamado">
                  {data.events.map((update) => (
                    <li
                      key={update.id}
                      className={
                        update.kind === 'status_changed'
                          ? 'support-status-event'
                          : `support-message ${update.actor_role}`
                      }
                    >
                      {update.kind === 'status_changed' ? (
                        <>
                          <span className="support-timeline-dot" />
                          <div>
                            <strong>{update.actor_name}</strong> alterou o status para{' '}
                            <strong>{statuses[update.status]}</strong>.
                            <time dateTime={update.created_at}>{dateTime(update.created_at)}</time>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="support-message-author">
                            <span className="support-avatar">
                              {update.actor_role === 'support'
                                ? 'B'
                                : update.actor_name.charAt(0).toUpperCase()}
                            </span>
                            <strong>
                              {update.actor_role === 'support'
                                ? 'Equipe Better'
                                : update.actor_name}
                            </strong>
                            <time dateTime={update.created_at}>{dateTime(update.created_at)}</time>
                          </div>
                          <p>{update.message}</p>
                          {update.kind === 'created' && (
                            <small>Início do chamado · {data.code}</small>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ol>
                <div className="support-composer">
                  {actionError && <Notice error message={actionError} />}
                  {notice && <Notice message={notice} />}
                  {data.status === 'closed' ? (
                    <p>
                      Este chamado foi encerrado. Para continuar a conversa, use{' '}
                      <strong>Reabrir chamado</strong>.
                    </p>
                  ) : (
                    <form
                      className="support-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        change('reply');
                      }}
                    >
                      <label htmlFor="support-reply">
                        Adicionar uma mensagem
                        <textarea
                          id="support-reply"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Escreva sua resposta ou compartilhe mais detalhes..."
                          maxLength={8000}
                          required
                          rows={4}
                        />
                      </label>
                      <div className="support-form-footer">
                        <span>Não compartilhe senhas ou chaves de acesso.</span>
                        <button className="button primary small" disabled={busy || !message.trim()}>
                          <Send size={16} />
                          {busy ? 'Enviando...' : 'Enviar mensagem'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </section>
              <aside className="support-details panel">
                <span className="icon-box blue-bg">
                  <Ticket size={22} />
                </span>
                <h2>Seu protocolo</h2>
                <strong className="support-protocol">{data.code}</strong>
                <dl>
                  <dt>Status atual</dt>
                  <dd>
                    <Badge status={data.status} />
                  </dd>
                  <dt>Categoria</dt>
                  <dd>{data.category_label}</dd>
                  <dt>Última atualização</dt>
                  <dd>{dateTime(data.updated_at)}</dd>
                </dl>
                <p>
                  Você pode voltar a esta página a qualquer momento para acompanhar as respostas da
                  equipe.
                </p>
              </aside>
            </div>
          </>
        )
      )}
    </>
  );
}
