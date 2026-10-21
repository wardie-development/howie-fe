'use client';
import { FormEvent, useState } from 'react';
import {
  Sparkles,
  Plus,
  Pencil,
  Pause,
  Play,
  LoaderCircle,
  MessageCircle,
  Unplug,
  ArrowUpRight,
  Bot,
} from 'lucide-react';
import Link from 'next/link';
import { api, list } from '@/lib/api';
import type { Agent } from '@/lib/types';
import { PageHeader, Loading, ErrorState, EmptyState, Modal, Notice, useLoad } from './ui';
export default function Agents() {
  const state = useLoad(() => list<Agent>('agents/'));
  const [editing, setEditing] = useState<Agent | true | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function toggle(agent: Agent) {
    setBusy(true);
    setError('');
    try {
      await api(`agents/${agent.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !agent.is_active }),
      });
      setNotice(
        agent.is_active
          ? 'Agente pausado. As próximas mensagens não receberão resposta automática.'
          : 'Agente retomado. Novas mensagens poderão ser atendidas.',
      );
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar.');
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const id = editing && editing !== true ? editing.id : null;
    try {
      await api(`agents/${id ? `${id}/` : ''}`, {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      setEditing(null);
      setNotice('Agente salvo. Você pode revisar as orientações a qualquer momento.');
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="INTELIGÊNCIA COM O SEU JEITO"
        title="Seu negócio tem voz."
        description="Crie e acompanhe os agentes que conversam com seus clientes."
      >
        <button
          className="button primary small"
          onClick={() => {
            setEditing(true);
            setError('');
          }}
        >
          <Plus size={17} /> Criar agente de IA
        </button>
      </PageHeader>
      {notice && <Notice message={notice} />}
      <div className="agent-guide">
        <span className="icon-box yellow-bg">
          <Sparkles size={25} />
        </span>
        <div>
          <h2>Boas orientações. Boas conversas.</h2>
          <p>
            Conte ao agente como atender, qual tom usar e quando pedir mais informações. Serviços e
            horários são consultados nos cadastros do seu negócio.
          </p>
        </div>
        <Link href="/app/servicos" className="text-link">
          Organizar serviços <ArrowUpRight size={17} />
        </Link>
      </div>
      {error && !editing && <Notice error message={error} />}
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorState message={state.error} retry={state.reload} />
      ) : !state.data?.length ? (
        <section className="panel">
          <EmptyState
            icon={Bot}
            title="O primeiro oi tem a sua personalidade."
            description="Crie um agente com nome e orientações de atendimento. A conexão com WhatsApp é uma etapa separada."
          />
        </section>
      ) : (
        <div className="agent-grid">
          {state.data.map((agent) => (
            <article className="agent-card" key={agent.id}>
              <div className="agent-card-head">
                <span className="agent-icon">
                  <Sparkles size={27} />
                </span>
                <span className={`status-pill ${agent.is_active ? 'positive' : 'neutral'}`}>
                  <i />
                  {agent.is_active ? 'Habilitado' : 'Pausado'}
                </span>
              </div>
              <h2>{agent.name}</h2>
              <p className="agent-prompt">
                {agent.custom_prompt ||
                  'Atendimento objetivo, gentil e útil. Adicione orientações para deixar o agente com o jeito do seu negócio.'}
              </p>
              <div className="agent-connection">
                {agent.connected ? <MessageCircle size={16} /> : <Unplug size={16} />}
                <span>
                  {agent.connected
                    ? 'Número de WhatsApp vinculado'
                    : 'WhatsApp ainda não vinculado'}
                </span>
              </div>
              <div className="agent-card-actions">
                <button
                  className="button secondary small"
                  onClick={() => {
                    setEditing(agent);
                    setError('');
                  }}
                >
                  <Pencil size={15} />
                  Editar agente
                </button>
                <button
                  className="icon-button"
                  disabled={busy}
                  onClick={() => toggle(agent)}
                  aria-label={agent.is_active ? 'Pausar agente' : 'Retomar agente'}
                >
                  {agent.is_active ? <Pause size={18} /> : <Play size={18} />}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="info-strip">
        <Unplug size={19} />
        <p>
          Criar um agente não conecta automaticamente um número de WhatsApp. A ativação da
          integração será acompanhada na sua demonstração.
        </p>
      </div>
      {editing && (
        <Modal
          title={editing === true ? 'Um novo agente, com seu jeito.' : 'Ajustar meu agente'}
          description="O nome e as orientações ajudam a definir a experiência de atendimento."
          onClose={() => !busy && setEditing(null)}
        >
          <form className="modal-form" onSubmit={save}>
            <label>
              Nome do agente
              <input
                name="name"
                required
                maxLength={255}
                placeholder="Ex.: Assistente do Studio Aurora"
                defaultValue={editing !== true ? editing.name : ''}
              />
            </label>
            <label>
              Orientações de atendimento
              <textarea
                name="custom_prompt"
                rows={8}
                maxLength={20000}
                placeholder="Ex.: Atenda com simpatia, use mensagens curtas e confirme o serviço e o profissional antes de reservar um horário."
                defaultValue={editing !== true ? editing.custom_prompt || '' : ''}
              />
              <small className="field-hint">
                Não coloque senhas ou credenciais nas orientações.
              </small>
            </label>
            {error && <Notice error message={error} />}
            <div className="modal-footer">
              <button
                className="button secondary"
                type="button"
                onClick={() => setEditing(null)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? <LoaderCircle size={17} className="spin" /> : null}Salvar agente
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
