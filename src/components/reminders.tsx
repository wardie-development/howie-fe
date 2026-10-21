'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Bell, Plus, Save, LoaderCircle, Pencil, Ban, RotateCcw } from 'lucide-react';
import { api, list, dateTime } from '@/lib/api';
import type { Agent, Appointment } from '@/lib/types';
import { useProfile } from './portal-shell';
import { PageHeader, Modal, Notice, Loading, ErrorState, EmptyState, useLoad } from './ui';

type Content = {
  name: string;
  minutes_before: number;
  message: string;
  allow_confirm: boolean;
  allow_reschedule: boolean;
  allow_cancel: boolean;
  skip_if_confirmed: boolean;
  confirm_message: string;
  cancel_message: string;
};
type Rule = Content & { id: number; enabled: boolean; template_status: string };
type Reminder = Content & {
  id: number;
  appointment: number;
  rule: number | null;
  agent: number | null;
  customized: boolean;
  timing: 'relative' | 'fixed';
  scheduled_at: string;
  status: string;
  reason: string;
  sent_at: string | null;
  template_status: string;
};
type Preferences = { enabled: boolean; agent: number | null };
const defaults: Content = {
  name: 'Lembrete de 24 horas',
  minutes_before: 1440,
  message:
    'Olá, {nome}! Seu atendimento de {servico} com {profissional} está marcado para {data}, às {hora}. Podemos confirmar sua presença?',
  allow_confirm: true,
  allow_reschedule: true,
  allow_cancel: true,
  skip_if_confirmed: false,
  confirm_message: 'Presença confirmada para {data}, às {hora}. Até lá, {nome}!',
  cancel_message: 'Seu agendamento de {data}, às {hora}, foi cancelado.',
};
const statusLabels: Record<string, string> = {
  pending: 'Programado',
  queued: 'Na fila',
  sending: 'Enviando',
  sent: 'Enviado',
  delivered: 'Entregue',
  read: 'Lido',
  blocked: 'Aguardando configuração',
  failed: 'Falha na entrega',
  unknown: 'Envio não confirmado',
  canceled: 'Desativado',
  skipped: 'Dispensado',
};
const approvalLabels: Record<string, string> = {
  NOT_SUBMITTED: 'Mensagem ainda não enviada para aprovação',
  PENDING: 'Aguardando aprovação do WhatsApp',
  APPROVED: 'Mensagem aprovada pelo WhatsApp',
  REJECTED: 'Mensagem reprovada pelo WhatsApp',
  PAUSED: 'Mensagem pausada pelo WhatsApp',
  DISABLED: 'Mensagem desativada pelo WhatsApp',
};
const immutable = new Set(['sending', 'sent', 'delivered', 'read', 'unknown']);
const variables = {
  nome: 'Ana',
  data: '25/12/2026',
  hora: '14:00',
  servico: 'Corte',
  profissional: 'Julia',
  empresa: 'Studio Exemplo',
};
const preview = (text: string) =>
  text.replace(
    /\{(nome|data|hora|servico|profissional|empresa)\}/g,
    (_, key: keyof typeof variables) => variables[key],
  );
function localInput(value: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(value))
    .replace(' ', 'T');
}

function ReminderEditor({
  initial,
  agents,
  individual,
  appointment,
  onClose,
  onSaved,
}: {
  initial?: Rule | Reminder;
  agents: Agent[];
  individual?: boolean;
  appointment?: Appointment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [message, setMessage] = useState(initial?.message || defaults.message);
  const [timing, setTiming] = useState((initial as Reminder)?.timing || 'relative');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const content = initial || defaults;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {
      name: form.get('name'),
      minutes_before: Math.round(Number(form.get('hours')) * 60),
      message,
      confirm_message: form.get('confirm_message'),
      cancel_message: form.get('cancel_message'),
    };
    for (const field of ['allow_confirm', 'allow_reschedule', 'allow_cancel', 'skip_if_confirmed'])
      body[field] = form.has(field);
    if (individual) {
      body.appointment = appointment!.id;
      body.timing = timing;
      const agent = form.get('agent');
      body.agent = agent ? Number(agent) : null;
      if (timing === 'fixed') body.scheduled_at = `${form.get('scheduled_at')}:00-03:00`;
    } else body.enabled = form.has('enabled');
    try {
      await api(
        `${individual ? 'reminders' : 'reminder-rules'}/${initial ? initial.id + '/' : ''}`,
        {
          method: initial ? 'PATCH' : 'POST',
          body: JSON.stringify(body),
        },
      );
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={individual ? 'Lembrete deste agendamento' : 'Configurar lembrete'}
      description={
        individual
          ? 'Esta alteração vale apenas para este agendamento.'
          : 'Esta regra gera lembretes para os próximos agendamentos.'
      }
      onClose={() => !busy && onClose()}
    >
      <form className="modal-form" onSubmit={save}>
        <label>
          Nome do lembrete
          <input name="name" defaultValue={content.name} maxLength={100} required />
        </label>
        {!individual && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={(initial as Rule)?.enabled ?? true}
            />
            Regra ativa
          </label>
        )}
        {individual && (
          <label>
            Quando enviar
            <select
              value={timing}
              onChange={(e) => setTiming(e.target.value as 'relative' | 'fixed')}
            >
              <option value="relative">Antes do agendamento</option>
              <option value="fixed">Data e hora fixa</option>
            </select>
          </label>
        )}
        <label>
          Antecedência em horas
          <input
            type="number"
            name="hours"
            defaultValue={content.minutes_before / 60}
            min={1 / 60}
            max={8760}
            step="any"
            required
          />
          <small>
            24 horas = um dia antes. Reservas feitas depois desse prazo são lembradas no próximo
            ciclo de envio.
          </small>
        </label>
        {individual && timing === 'fixed' && (
          <label>
            Data e hora do envio · Fortaleza
            <input
              type="datetime-local"
              name="scheduled_at"
              required
              defaultValue={
                (initial as Reminder)?.scheduled_at
                  ? localInput((initial as Reminder).scheduled_at)
                  : undefined
              }
              max={appointment ? localInput(appointment.starts_at) : undefined}
            />
          </label>
        )}
        {individual && (
          <label>
            Agente responsável
            <select name="agent" defaultValue={(initial as Reminder)?.agent ?? ''}>
              <option value="">Padrão da empresa</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                  {agent.connected ? '' : ' · WhatsApp não conectado'}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Mensagem
          <textarea
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={1024}
            required
          />
        </label>
        <div className="reminder-variables" aria-label="Inserir variável na mensagem">
          {Object.keys(variables).map((key) => (
            <button
              type="button"
              className="button secondary small"
              key={key}
              onClick={() => setMessage((text) => text + ` {${key}}`)}
            >{`{${key}}`}</button>
          ))}
        </div>
        <div className="reminder-preview">
          <small>PRÉVIA COM DADOS DE EXEMPLO</small>
          <p>{preview(message)}</p>
        </div>
        <fieldset className="reminder-actions">
          <legend>Ações disponíveis para o cliente</legend>
          {[
            ['allow_confirm', 'Confirmar presença'],
            ['allow_reschedule', 'Reagendar com o agente'],
            ['allow_cancel', 'Cancelar agendamento'],
          ].map(([field, label]) => (
            <label className="checkbox-label" key={field}>
              <input
                name={field}
                type="checkbox"
                defaultChecked={content[field as keyof Content] as boolean}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="checkbox-label">
          <input
            name="skip_if_confirmed"
            type="checkbox"
            defaultChecked={content.skip_if_confirmed}
          />
          Dispensar este lembrete se a presença já estiver confirmada
        </label>
        <label>
          Resposta após confirmar
          <textarea
            name="confirm_message"
            defaultValue={content.confirm_message}
            rows={2}
            maxLength={1024}
            required
          />
        </label>
        <label>
          Resposta após cancelar
          <textarea
            name="cancel_message"
            defaultValue={content.cancel_message}
            rows={2}
            maxLength={1024}
            required
          />
          <small>Você pode usar as mesmas variáveis nas respostas.</small>
        </label>
        <p className="field-hint">
          Mensagens para iniciar uma conversa precisam de aprovação do WhatsApp. Depois de salvar,
          solicite a aprovação na lista. Personalizar o texto ou os botões pode exigir uma nova
          aprovação.
        </p>
        {error && <Notice error message={error} />}
        <div className="modal-footer">
          <button className="button secondary" type="button" disabled={busy} onClick={onClose}>
            Voltar
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}Salvar lembrete
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Reminders() {
  const state = useLoad(async () => ({
    preferences: await api<Preferences>('reminder-settings/'),
    rules: await list<Rule>('reminder-rules/'),
    agents: await list<Agent>('agents/'),
  }));
  const [editing, setEditing] = useState<Rule | true | null>(null);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [error, setError] = useState('');
  const [applying, setApplying] = useState<Rule | null>(null);
  async function action(path: string, body?: unknown, message = 'Configuração atualizada.') {
    setBusy(true);
    setError('');
    try {
      await api(path, {
        method: body ? 'PATCH' : 'POST',
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      setNotice(message);
      state.reload();
      setApplying(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar.');
    } finally {
      setBusy(false);
    }
  }
  if (state.loading && !state.data) return <Loading />;
  if (!state.data) return <ErrorState message={state.error} retry={state.reload} />;
  const { preferences, rules, agents } = state.data;
  return (
    <>
      <PageHeader
        eyebrow="UM CUIDADO ANTES DE CADA ENCONTRO"
        title="Lembretes que acompanham sua agenda."
        description="Defina o padrão da empresa e personalize cada agendamento quando precisar."
      >
        <button className="button primary small" onClick={() => setEditing(true)}>
          <Plus size={17} />
          Nova regra
        </button>
      </PageHeader>
      {notice && <Notice message={notice} />}
      {error && <Notice error message={error} />}
      <section className="panel reminder-settings">
        <div>
          <h2>Lembretes automáticos</h2>
          <p>
            Ao ativar, os agendamentos futuros sem lembretes recebem as regras ativas. Se não houver
            uma regra ativa, criamos o padrão de 24 horas antes.
          </p>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={preferences.enabled}
            disabled={busy}
            onChange={(e) => action('reminder-settings/', { enabled: e.target.checked })}
          />
          Ativar lembretes da empresa
        </label>
        <label>
          Quem atende os pedidos de remarcação?
          <select
            value={preferences.agent ?? ''}
            disabled={busy}
            onChange={(e) =>
              action('reminder-settings/', {
                agent: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Selecione um agente</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
                {agent.connected ? '' : ' · WhatsApp não conectado'}
              </option>
            ))}
          </select>
        </label>
        <p className="field-hint">
          O agente selecionado envia os novos lembretes e atende as remarcações. Alterar esta
          seleção não troca o responsável dos lembretes já criados. Pausar o agente não desativa os
          lembretes.
        </p>
        <p className="field-hint">
          Registre a autorização de cada cliente em <Link href="/app/clientes">Clientes</Link>. O
          envio aguarda essa autorização e a conexão do WhatsApp.
        </p>
      </section>
      <section className="panel resource-panel">
        <div className="panel-head">
          <div>
            <h2>Regras da empresa</h2>
            <p>Editar uma regra não altera automaticamente os lembretes existentes.</p>
          </div>
          <span className="count-tag">{rules.length} regras</span>
        </div>
        {!rules.length ? (
          <EmptyState
            icon={Bell}
            title="Seu primeiro lembrete começa aqui."
            description="Ative os lembretes para criar a regra padrão de 24 horas ou adicione uma regra personalizada."
          />
        ) : (
          <div className="reminder-list">
            {rules.map((rule) => (
              <article className="reminder-card" key={rule.id}>
                <div className="reminder-card-title">
                  <div>
                    <strong>{rule.name}</strong>
                    <small>
                      {rule.minutes_before / 60} horas antes ·{' '}
                      {rule.enabled ? 'Ativa' : 'Desativada'}
                    </small>
                  </div>
                  <span className={`status-pill ${rule.enabled ? 'positive' : 'neutral'}`}>
                    {rule.enabled ? 'Ativa' : 'Desativada'}
                  </span>
                </div>
                <p>{rule.message}</p>
                <small>
                  {approvalLabels[rule.template_status] || 'Verifique a aprovação no WhatsApp'}
                </small>
                <div className="reminder-toolbar">
                  <button className="button secondary small" onClick={() => setEditing(rule)}>
                    <Pencil size={15} />
                    Editar
                  </button>
                  <button
                    className="button secondary small"
                    disabled={busy}
                    onClick={() =>
                      action(
                        `reminder-rules/${rule.id}/approval/`,
                        undefined,
                        'Status de aprovação atualizado.',
                      )
                    }
                  >
                    Solicitar / consultar aprovação
                  </button>
                  <button
                    className="button secondary small"
                    disabled={busy}
                    onClick={() => setApplying(rule)}
                  >
                    Aplicar aos pendentes
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {editing && (
        <ReminderEditor
          initial={editing === true ? undefined : editing}
          agents={agents}
          onClose={() => setEditing(null)}
          onSaved={() => {
            state.reload();
            setNotice('Regra salva. Os lembretes existentes foram preservados.');
          }}
        />
      )}
      {applying && (
        <Modal
          title="Atualizar lembretes pendentes?"
          description={`Aplicar a regra “${applying.name}” aos lembretes existentes que ainda não foram personalizados. Envios iniciados ou concluídos serão preservados.`}
          onClose={() => !busy && setApplying(null)}
        >
          <div className="modal-footer">
            <button className="button secondary" disabled={busy} onClick={() => setApplying(null)}>
              Voltar
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                action(
                  `reminder-rules/${applying.id}/apply/`,
                  undefined,
                  'Lembretes pendentes atualizados.',
                )
              }
            >
              Aplicar alterações
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function AppointmentReminders({ appointment }: { appointment: Appointment }) {
  const profile = useProfile();
  const state = useLoad(
    async () => ({
      reminders: await list<Reminder>(`reminders/?appointment=${appointment.id}`),
      agents: await list<Agent>('agents/'),
      preferences: await api<Preferences>('reminder-settings/'),
    }),
    [appointment.id],
  );
  const [editing, setEditing] = useState<Reminder | true | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function action(path: string, method = 'POST') {
    setBusy(true);
    setError('');
    try {
      await api(path, { method });
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar o lembrete.');
    } finally {
      setBusy(false);
    }
  }
  const past =
    new Date(appointment.starts_at).getTime() <= Date.now() || appointment.status === 'canceled';
  return (
    <section className="appointment-reminders">
      <div className="reminder-card-title">
        <h3>
          <Bell size={17} />
          Lembretes deste agendamento
        </h3>
        {!past && (
          <button className="button secondary small" onClick={() => setEditing(true)}>
            <Plus size={15} />
            Adicionar
          </button>
        )}
      </div>
      {state.loading && <Loading />}
      {state.error && <ErrorState message={state.error} retry={state.reload} />}
      {error && <Notice error message={error} />}
      {state.data && !state.data.preferences.enabled && (
        <p className="field-hint">
          Os envios estão pausados. Ative em <Link href="/app/lembretes">Lembretes da empresa</Link>
          .
        </p>
      )}
      {state.data && !state.data.reminders.length && (
        <p className="muted">Nenhum lembrete programado para este agendamento.</p>
      )}
      {state.data?.reminders.map((reminder) => (
        <article className="reminder-card" key={reminder.id}>
          <div className="reminder-card-title">
            <strong>{reminder.name}</strong>
            <span className="count-tag">{statusLabels[reminder.status] || 'Aguardando'}</span>
          </div>
          <small>
            {dateTime(reminder.scheduled_at)} ·{' '}
            {reminder.customized ? 'Personalizado' : 'Padrão da empresa'} ·{' '}
            {reminder.timing === 'fixed' ? 'Data fixa' : 'Acompanha remarcações'}
          </small>
          <p>
            {reminder.message.replace(
              /\{(nome|data|hora|servico|profissional|empresa)\}/g,
              (_, key: string) =>
                (
                  ({
                    nome: appointment.client_name,
                    data: new Date(appointment.starts_at).toLocaleDateString('pt-BR', {
                      timeZone: 'America/Fortaleza',
                    }),
                    hora: new Date(appointment.starts_at).toLocaleTimeString('pt-BR', {
                      timeZone: 'America/Fortaleza',
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    servico: appointment.service_name,
                    profissional: appointment.professional_name,
                    empresa: profile.company.name,
                  }) as Record<string, string>
                )[key],
            )}
          </p>
          {reminder.reason && <p className="field-hint">{reminder.reason}</p>}
          {!immutable.has(reminder.status) && !past && (
            <>
              <small>
                {approvalLabels[reminder.template_status] || 'Verifique a aprovação no WhatsApp'}
              </small>
              <div className="reminder-toolbar">
                <button
                  className="button secondary small"
                  disabled={busy}
                  onClick={() => setEditing(reminder)}
                >
                  <Pencil size={14} />
                  Personalizar
                </button>
                {reminder.status !== 'canceled' && (
                  <button
                    className="button secondary small"
                    disabled={busy}
                    onClick={() => action(`reminders/${reminder.id}/`, 'DELETE')}
                  >
                    <Ban size={14} />
                    Desativar
                  </button>
                )}
                {reminder.rule && (reminder.customized || reminder.status === 'canceled') && (
                  <button
                    className="button secondary small"
                    disabled={busy}
                    onClick={() => action(`reminders/${reminder.id}/restore/`)}
                  >
                    <RotateCcw size={14} />
                    Restaurar padrão
                  </button>
                )}
                <button
                  className="button secondary small"
                  disabled={busy}
                  onClick={() => action(`reminders/${reminder.id}/approval/`)}
                >
                  Aprovação WhatsApp
                </button>
              </div>
            </>
          )}
        </article>
      ))}
      {editing && (
        <ReminderEditor
          individual
          appointment={appointment}
          initial={editing === true ? undefined : editing}
          agents={state.data?.agents || []}
          onClose={() => setEditing(null)}
          onSaved={state.reload}
        />
      )}
    </section>
  );
}
