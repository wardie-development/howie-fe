'use client';
import { useState } from 'react';
import { MessageCircle, RotateCcw, ArrowLeft, Sparkles, LoaderCircle } from 'lucide-react';
import { api, list, dateTime } from '@/lib/api';
import type { Chat, Message } from '@/lib/types';
import {
  PageHeader,
  Loading,
  ErrorState,
  EmptyState,
  Modal,
  Notice,
  SearchField,
  useLoad,
} from './ui';
export default function Conversations() {
  const state = useLoad(() => list<Chat>('chats/'));
  const [selected, setSelected] = useState<Chat | null>(null),
    [search, setSearch] = useState(''),
    [resetting, setResetting] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [error, setError] = useState('');
  const messages = useLoad(
    () => (selected ? list<Message>(`chats/${selected.id}/messages/`) : Promise.resolve([])),
    [selected?.id],
  );
  async function reset() {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<{ detail: string }>(`chats/${selected.id}/reset/`, {
        method: 'POST',
      });
      setNotice(result.detail);
      setResetting(false);
      messages.reload();
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível reiniciar.');
    } finally {
      setBusy(false);
    }
  }
  const filtered =
    state.data?.filter((c) =>
      `${c.client_name} ${c.client_phone}`.toLowerCase().includes(search.toLowerCase()),
    ) || [];
  return (
    <>
      <PageHeader
        eyebrow="CADA CONVERSA IMPORTA"
        title="Conexões que ficam."
        description="Acompanhe as mensagens dos seus clientes e o contexto do atendimento."
      />
      {notice && <Notice message={notice} />}
      <section className={`panel conversations-layout ${selected ? 'has-selected' : ''}`}>
        <aside className="conversation-list">
          <div className="conversation-search">
            <SearchField value={search} onChange={setSearch} placeholder="Buscar cliente..." />
          </div>
          {state.loading ? (
            <Loading />
          ) : state.error ? (
            <ErrorState message={state.error} retry={state.reload} />
          ) : !filtered.length ? (
            <EmptyState
              icon={MessageCircle}
              title="Tudo começa com um oi."
              description={
                search
                  ? 'Nenhum contato encontrado.'
                  : 'As conversas do seu WhatsApp conectado aparecerão aqui.'
              }
            />
          ) : (
            filtered.map((chat) => (
              <button
                className={`conversation-item ${selected?.id === chat.id ? 'selected' : ''}`}
                key={chat.id}
                onClick={() => {
                  setSelected(chat);
                  setNotice('');
                  setError('');
                }}
              >
                <span className="contact-avatar">{chat.client_name.slice(0, 1)}</span>
                <span>
                  <strong>{chat.client_name}</strong>
                  <small>{chat.last_message?.content || 'Sem mensagens'}</small>
                </span>
              </button>
            ))
          )}
        </aside>
        <div className="conversation-detail">
          {!selected ? (
            <EmptyState
              icon={MessageCircle}
              title="Uma conversa de cada vez."
              description="Selecione um contato para consultar o histórico e as respostas do agente."
            />
          ) : (
            <>
              <div className="conversation-detail-head">
                <button
                  className="icon-button mobile-only"
                  aria-label="Voltar para conversas"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft size={18} />
                </button>
                <span className="contact-avatar">{selected.client_name.slice(0, 1)}</span>
                <div>
                  <strong>{selected.client_name}</strong>
                  <small>
                    {selected.client_phone} · {selected.agent_name}
                  </small>
                </div>
                <button
                  className="button secondary small"
                  onClick={() => {
                    setResetting(true);
                    setError('');
                  }}
                >
                  <RotateCcw size={15} />
                  <span>Reiniciar contexto</span>
                </button>
              </div>
              <div className="conversation-messages">
                {messages.loading ? (
                  <Loading />
                ) : messages.error ? (
                  <ErrorState message={messages.error} retry={messages.reload} />
                ) : (
                  messages.data
                    ?.slice()
                    .reverse()
                    .map((message) => (
                      <article key={message.id} className={`history-message role-${message.role}`}>
                        <span>
                          {message.role === 'assistant'
                            ? 'Agente de IA'
                            : message.role === 'system'
                              ? 'Sistema'
                              : selected.client_name}
                        </span>
                        <p>{message.content}</p>
                        <small>{dateTime(message.created_at)}</small>
                      </article>
                    ))
                )}
              </div>
              <div className="conversation-readonly">
                <Sparkles size={15} /> Histórico para acompanhamento. O atendimento acontece pelo
                WhatsApp.
              </div>
            </>
          )}
        </div>
      </section>
      {resetting && (
        <Modal
          title="Começar um novo contexto?"
          description="O agente deixará de usar as mensagens anteriores como contexto. Histórico, cliente e agendamentos serão preservados. Mensagens antigas pendentes serão encerradas."
          onClose={() => !busy && setResetting(false)}
        >
          {error && <Notice error message={error} />}
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setResetting(false)}
              disabled={busy}
            >
              Manter contexto
            </button>
            <button className="button primary" disabled={busy} onClick={reset}>
              {busy ? <LoaderCircle className="spin" size={17} /> : <RotateCcw size={17} />}
              Reiniciar contexto
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
