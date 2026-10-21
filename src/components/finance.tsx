'use client';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  CheckCheck,
  Coins,
  Wallet,
  Clock3,
  RotateCcw,
  CalendarDays,
  ArrowRight,
  LoaderCircle,
} from 'lucide-react';
import { api, list, money, dateTime } from '@/lib/api';
import type { Appointment, Professional, Service } from '@/lib/types';
import type { FinancialAttendance, AttendanceDetail, FinanceOverview } from '@/lib/finance';
import {
  attendanceLabels,
  paymentLabels,
  methodLabels,
  financeDate,
  financeDateTime,
} from '@/lib/finance';
import { PageHeader, Modal, Notice, Loading, ErrorState, EmptyState, useLoad } from './ui';

type Mode = 'detail' | 'finalize' | 'payment' | 'refund' | 'reopen';
function PaymentFields({ max, optional = false }: { max: number; optional?: boolean }) {
  return (
    <>
      <label>
        Valor recebido{optional ? ' agora' : ''}
        <input
          name="amount"
          type="number"
          min="0.01"
          max={max.toFixed(2)}
          step="0.01"
          defaultValue={max.toFixed(2)}
          required
        />
      </label>
      <label>
        Forma de pagamento
        <select name="method" defaultValue="pix">
          {Object.entries(methodLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Data e hora do recebimento · Fortaleza
        <input
          type="datetime-local"
          name="paid_at"
          defaultValue={financeDateTime(new Date())}
          max={financeDateTime(new Date())}
          required
        />
      </label>
    </>
  );
}

function FinanceForm({
  record,
  mode,
  onSaved,
  onBack,
}: {
  record: AttendanceDetail;
  mode: Exclude<Mode, 'detail'>;
  onSaved: () => void;
  onBack: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [outcome, setOutcome] = useState('completed'),
    [amount, setAmount] = useState(record.service_amount),
    [discount, setDiscount] = useState(record.discount),
    [receiveNow, setReceiveNow] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());
  const charge = Math.max(0, Number(amount) - Number(discount));
  const remaining = Math.max(0, charge - Number(record.net_received));
  const changed =
    Number(amount) !== Number(record.service_amount) ||
    Number(discount) !== Number(record.discount);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const payment = () => ({
      amount: form.get('amount'),
      method: form.get('method'),
      paid_at: `${form.get('paid_at')}:00-03:00`,
      request_id: requestId,
      notes: mode === 'finalize' ? '' : form.get('notes') || '',
      kind: mode === 'refund' ? 'refund' : 'payment',
    });
    let body: Record<string, unknown>;
    let path: string;
    if (mode === 'finalize') {
      path = 'finalize';
      body = { status: outcome, notes: form.get('notes') || '' };
      if (outcome === 'completed') {
        Object.assign(body, { service_amount: amount, discount, reason: form.get('reason') || '' });
        if (receiveNow && remaining > 0) body.payment = payment();
      }
    } else if (mode === 'reopen') {
      path = 'reopen';
      body = { reason: form.get('reason') };
    } else {
      path = 'payments';
      body = payment();
    }
    try {
      await api(`finance/appointments/${record.id}/${path}/`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="modal-form finance-entry-form" onSubmit={save}>
      {mode === 'finalize' && (
        <>
          <label>
            Como foi o atendimento?
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              <option value="completed">Serviço realizado</option>
              <option value="no_show">Cliente não compareceu</option>
              <option value="canceled">Atendimento cancelado</option>
            </select>
          </label>
          {outcome === 'completed' ? (
            <>
              <div className="form-grid">
                <label>
                  Valor do serviço
                  <input
                    type="number"
                    min="0"
                    max="99999999.99"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Desconto em reais
                  <input
                    type="number"
                    min="0"
                    max={amount || '0'}
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="finance-total-line">
                <span>Valor final</span>
                <strong>{money(charge)}</strong>
              </div>
              <small className="field-hint">
                Valor registrado no agendamento: {money(record.price_snapshot)}. Ajustar este
                atendimento preserva o preço do cadastro do serviço.
              </small>
              {changed && (
                <label>
                  Motivo do ajuste ou desconto
                  <textarea name="reason" rows={2} maxLength={1000} required />
                </label>
              )}
              {remaining > 0 && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={receiveNow}
                    onChange={(e) => setReceiveNow(e.target.checked)}
                  />
                  Registrar um pagamento que já foi recebido
                </label>
              )}
              {receiveNow && remaining > 0 && <PaymentFields max={remaining} optional />}
              {Number(record.net_received) > charge && (
                <Notice
                  message={`Há ${money(Number(record.net_received) - charge)} recebidos a mais. O valor ficará indicado para devolução.`}
                />
              )}
            </>
          ) : (
            <p className="info-strip">
              Este atendimento ficará sem cobrança. Valores já recebidos continuarão no histórico e
              serão indicados para devolução.
            </p>
          )}
          <label>
            Observações <span className="optional">Opcional</span>
            <textarea
              name="notes"
              defaultValue={record.financial_notes}
              rows={2}
              maxLength={2000}
            />
          </label>
        </>
      )}
      {(mode === 'payment' || mode === 'refund') && (
        <>
          <div className="info-strip">
            <p>
              {mode === 'refund'
                ? 'Registre aqui uma devolução que já foi feita ao cliente. Este registro não movimenta dinheiro nem altera o valor do serviço. Para dispensar a cobrança, corrija a finalização.'
                : 'Registre um pagamento que já foi recebido. Você pode informar o valor total ou uma parcela.'}
            </p>
          </div>
          {mode === 'refund' ? (
            <>
              <label>
                Valor devolvido
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  max={record.net_received}
                  step="0.01"
                  defaultValue={
                    Number(record.refund_due) > 0 ? record.refund_due : record.net_received
                  }
                  required
                />
              </label>
              <label>
                Forma da devolução
                <select name="method">
                  {Object.entries(methodLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Data e hora da devolução · Fortaleza
                <input
                  type="datetime-local"
                  name="paid_at"
                  required
                  defaultValue={financeDateTime(new Date())}
                  max={financeDateTime(new Date())}
                />
              </label>
            </>
          ) : (
            <PaymentFields max={Number(record.balance)} />
          )}
          <label>
            Observações <span className="optional">Opcional</span>
            <textarea name="notes" rows={2} maxLength={1000} />
          </label>
        </>
      )}
      {mode === 'reopen' && (
        <>
          <p className="info-strip">
            A finalização será desfeita para permitir uma correção. Os pagamentos e o histórico
            serão preservados.
          </p>
          <label>
            Motivo da reabertura
            <textarea name="reason" rows={3} maxLength={1000} required />
          </label>
        </>
      )}
      {error && <Notice error message={error} />}
      <div className="modal-footer">
        <button type="button" className="button secondary" onClick={onBack} disabled={busy}>
          Voltar
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />}
          {mode === 'finalize'
            ? 'Finalizar atendimento'
            : mode === 'reopen'
              ? 'Reabrir atendimento'
              : mode === 'refund'
                ? 'Registrar devolução'
                : 'Registrar recebimento'}
        </button>
      </div>
    </form>
  );
}

export function FinanceDialog({
  appointmentId,
  initialMode = 'detail',
  onClose,
  onUpdated,
}: {
  appointmentId: number;
  initialMode?: Mode;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const state = useLoad(
    () => api<AttendanceDetail>(`finance/appointments/${appointmentId}/`),
    [appointmentId],
  );
  const [mode, setMode] = useState<Mode>(initialMode),
    [notice, setNotice] = useState('');
  const record = state.data;
  const canFinalize = record?.awaiting_finalization;
  const canReceive =
    record &&
    ['pending', 'completed'].includes(record.financial_state) &&
    Number(record.balance) > 0;
  return (
    <Modal
      title={record?.service_name || 'Atendimento e pagamentos'}
      description={
        record
          ? `${record.client_name} · ${dateTime(record.starts_at)}`
          : 'Carregando as informações do atendimento.'
      }
      onClose={onClose}
    >
      {state.loading && !record ? (
        <Loading />
      ) : state.error ? (
        <ErrorState message={state.error} retry={state.reload} />
      ) : (
        record && (
          <>
            {notice && <Notice message={notice} />}
            {mode !== 'detail' ? (
              <FinanceForm
                key={`${record.id}-${mode}`}
                record={record}
                mode={mode}
                onBack={() => setMode('detail')}
                onSaved={() => {
                  setMode('detail');
                  setNotice('Registro atualizado.');
                  state.reload();
                  onUpdated();
                }}
              />
            ) : (
              <div className="finance-detail">
                <div className="finance-detail-badges">
                  <span
                    className={`status-pill ${record.financial_state === 'completed' ? 'positive' : 'neutral'}`}
                  >
                    {attendanceLabels[record.financial_state]}
                  </span>
                  <span
                    className={`status-pill ${record.payment_status === 'paid' ? 'positive' : record.payment_status === 'refund_due' ? 'negative' : 'neutral'}`}
                  >
                    {paymentLabels[record.payment_status]}
                  </span>
                </div>
                <div className="finance-detail-grid">
                  {[
                    ['Valor do agendamento', record.price_snapshot],
                    ['Desconto', record.discount],
                    ['Valor final', record.final_amount],
                    ['Recebido líquido', record.net_received],
                    ['Saldo em aberto', record.balance],
                    ['A devolver', record.refund_due],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <small>{label}</small>
                      <strong>{money(value)}</strong>
                    </div>
                  ))}
                </div>
                <p className="field-hint">
                  {record.professional_name} ·{' '}
                  {record.finalized_at
                    ? `Finalizado em ${dateTime(record.finalized_at)}`
                    : 'O horário passado só conta como realizado depois da finalização.'}
                </p>
                {record.financial_notes && <p>{record.financial_notes}</p>}
                <div className="finance-actions">
                  {canFinalize && (
                    <button
                      className="button primary small"
                      disabled={state.loading}
                      onClick={() => setMode('finalize')}
                    >
                      <CheckCheck size={16} />
                      Finalizar atendimento
                    </button>
                  )}
                  {canReceive && (
                    <button
                      className="button secondary small"
                      disabled={state.loading}
                      onClick={() => setMode('payment')}
                    >
                      <Wallet size={16} />
                      Registrar recebimento
                    </button>
                  )}
                  {Number(record.net_received) > 0 && (
                    <button
                      className="button secondary small"
                      disabled={state.loading}
                      onClick={() => setMode('refund')}
                    >
                      <RotateCcw size={16} />
                      Registrar devolução
                    </button>
                  )}
                  {['completed', 'no_show'].includes(record.financial_state) && (
                    <button
                      className="button secondary small"
                      disabled={state.loading}
                      onClick={() => setMode('reopen')}
                    >
                      Corrigir finalização
                    </button>
                  )}
                </div>
                <section>
                  <h3>Recebimentos e devoluções</h3>
                  {record.payments.length ? (
                    <div className="finance-payment-list">
                      {record.payments.map((payment) => (
                        <div key={payment.id}>
                          <span>
                            {payment.kind === 'refund' ? 'Devolução' : 'Recebimento'} ·{' '}
                            {methodLabels[payment.method]}
                            <small>
                              {dateTime(payment.paid_at)}
                              {payment.notes ? ` · ${payment.notes}` : ''}
                            </small>
                          </span>
                          <strong className={payment.kind === 'refund' ? 'finance-negative' : ''}>
                            {payment.kind === 'refund' ? '− ' : ''}
                            {money(payment.amount)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">Nenhum pagamento registrado para este atendimento.</p>
                  )}
                </section>
                {record.audit.length > 0 && (
                  <details className="finance-audit">
                    <summary>Histórico de alterações</summary>
                    {record.audit.map((item) => (
                      <div key={item.id}>
                        <strong>
                          {(
                            {
                              finalized: 'Atendimento finalizado',
                              reopened: 'Atendimento reaberto',
                              payment: 'Recebimento registrado',
                              refund: 'Devolução registrada',
                              agenda_canceled: 'Cancelado na agenda',
                            } as Record<string, string>
                          )[item.action] || 'Registro atualizado'}
                        </strong>
                        <small>
                          {dateTime(item.created_at)} · {item.actor}
                        </small>
                        {typeof item.details.reason === 'string' && item.details.reason && (
                          <p>{item.details.reason}</p>
                        )}
                      </div>
                    ))}
                  </details>
                )}
              </div>
            )}
          </>
        )
      )}
    </Modal>
  );
}

export function AppointmentFinance({
  appointment,
  onUpdated,
}: {
  appointment: Appointment;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="appointment-finance">
      <div>
        <h3>
          <Coins size={17} />
          Atendimento e financeiro
        </h3>
        <p>Finalize o serviço e acompanhe recebimentos e saldo neste mesmo agendamento.</p>
      </div>
      <button className="button secondary small" onClick={() => setOpen(true)}>
        Ver valores e pagamentos <ArrowRight size={15} />
      </button>
      {open && (
        <FinanceDialog
          appointmentId={appointment.id}
          onClose={() => setOpen(false)}
          onUpdated={onUpdated}
        />
      )}
    </section>
  );
}

type Filters = {
  start: string;
  end: string;
  professional: string;
  service: string;
  status: string;
  payment_status: string;
  search: string;
};
function initialFilters(finalization: boolean): Filters {
  const today = financeDate(new Date());
  return {
    start: finalization ? '' : `${today.slice(0, 7)}-01`,
    end: finalization
      ? ''
      : financeDate(
          new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0, 15)),
        ),
    professional: '',
    service: '',
    status: finalization ? 'awaiting' : 'completed',
    payment_status: 'all',
    search: '',
  };
}
function FilterBar({
  filters,
  setFilters,
  options,
  listView = true,
}: {
  filters: Filters;
  setFilters: (value: Filters) => void;
  options: { professionals: Professional[]; services: Service[] } | null;
  listView?: boolean;
}) {
  const update = (key: keyof Filters, value: string) => setFilters({ ...filters, [key]: value });
  return (
    <div className="panel finance-filters">
      <label>
        De
        <input
          type="date"
          value={filters.start}
          onChange={(e) => update('start', e.target.value)}
        />
      </label>
      <label>
        Até
        <input
          type="date"
          value={filters.end}
          min={filters.start || undefined}
          onChange={(e) => update('end', e.target.value)}
        />
      </label>
      <label>
        Profissional
        <select
          value={filters.professional}
          onChange={(e) => update('professional', e.target.value)}
        >
          <option value="">Todos</option>
          {options?.professionals.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Serviço
        <select value={filters.service} onChange={(e) => update('service', e.target.value)}>
          <option value="">Todos</option>
          {options?.services.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {listView && (
        <>
          <label>
            Atendimento
            <select value={filters.status} onChange={(e) => update('status', e.target.value)}>
              <option value="all">Todos</option>
              <option value="awaiting">Para finalizar</option>
              <option value="pending">Ainda não finalizados</option>
              <option value="completed">Realizados</option>
              <option value="no_show">Não compareceu</option>
              <option value="canceled">Cancelados</option>
            </select>
          </label>
          <label>
            Pagamento
            <select
              value={filters.payment_status}
              onChange={(e) => update('payment_status', e.target.value)}
            >
              <option value="all">Todos</option>
              {Object.entries(paymentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <button
        className="button secondary small"
        onClick={() =>
          setFilters({
            ...filters,
            start: '',
            end: '',
            professional: '',
            service: '',
            payment_status: 'all',
            search: '',
          })
        }
      >
        Limpar filtros
      </button>
    </div>
  );
}
function query(filters: Filters) {
  return new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
}

export default function Finance({
  finalization = false,
  overview = false,
}: {
  finalization?: boolean;
  overview?: boolean;
}) {
  const [filters, setFilters] = useState(() => initialFilters(finalization));
  const options = useLoad(async () => ({
    professionals: await list<Professional>('professionals/'),
    services: await list<Service>('services/'),
  }));
  const qs = query(filters);
  const records = useLoad(
    () =>
      overview
        ? Promise.resolve([] as FinancialAttendance[])
        : list<FinancialAttendance>(`finance/appointments/?${qs}`),
    [qs, overview],
  );
  const summary = useLoad(
    () => (overview ? api<FinanceOverview>(`finance/overview/?${qs}`) : Promise.resolve(null)),
    [qs, overview],
  );
  const [selected, setSelected] = useState<number[]>([]),
    [dialog, setDialog] = useState<{ id: number; mode: Mode } | null>(null),
    [batch, setBatch] = useState(false),
    [batchStatus, setBatchStatus] = useState('completed');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  useEffect(() => setSelected([]), [qs]);
  const eligible = (records.data || []).filter((item) => item.awaiting_finalization);
  const reload = () => {
    records.reload();
    summary.reload();
    setSelected([]);
  };
  async function finalizeBatch() {
    setBusy(true);
    setError('');
    try {
      await api('finance/appointments/finalize-batch/', {
        method: 'POST',
        body: JSON.stringify({ ids: selected, status: batchStatus }),
      });
      setBatch(false);
      setNotice(`${selected.length} atendimento(s) finalizado(s).`);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível finalizar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow={finalization ? 'UM ÚLTIMO PASSO, TUDO EM DIA' : 'CLAREZA PARA CUIDAR DO NEGÓCIO'}
        title={
          finalization
            ? 'Finalize os encontros do seu dia.'
            : overview
              ? 'Os números do seu trabalho.'
              : 'Cada atendimento, cada recebimento.'
        }
        description={
          finalization
            ? 'Confira o que aconteceu. O horário passado só entra no realizado depois da sua confirmação.'
            : overview
              ? 'Acompanhe os valores previstos, os serviços realizados e os pagamentos registrados.'
              : 'Veja valores, descontos e pagamentos dos mesmos agendamentos da sua agenda.'
        }
      >
        {finalization ? (
          <Link href="/app/financeiro" className="button secondary small">
            Ver financeiro <ArrowRight size={16} />
          </Link>
        ) : (
          <Link href="/app/finalizar" className="button secondary small">
            <CheckCheck size={17} />
            Finalizar atendimentos
          </Link>
        )}
      </PageHeader>
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        options={options.data}
        listView={!overview}
      />
      {options.error && <Notice error message={options.error} />}
      {notice && <Notice message={notice} />}
      {error && !batch && <Notice error message={error} />}
      {overview ? (
        summary.loading ? (
          <Loading />
        ) : summary.error || !summary.data ? (
          <ErrorState message={summary.error} retry={summary.reload} />
        ) : (
          <>
            <div className="stat-grid finance-stat-grid">
              {[
                {
                  label: 'Valor previsto',
                  value: summary.data.estimated,
                  icon: CalendarDays,
                  tone: 'blue',
                  detail: 'Atendimentos ainda não encerrados no período',
                },
                {
                  label: 'Serviços realizados',
                  value: summary.data.completed,
                  icon: CheckCheck,
                  tone: 'yellow',
                  detail: `${summary.data.completed_count} atendimento${summary.data.completed_count === 1 ? '' : 's'} finalizado${summary.data.completed_count === 1 ? '' : 's'} no período`,
                },
                {
                  label: 'Recebido líquido',
                  value: summary.data.net_received,
                  icon: Wallet,
                  tone: 'green',
                  detail: 'Recebimentos menos devoluções nas datas selecionadas',
                },
                {
                  label: 'A receber',
                  value: summary.data.receivable,
                  icon: Clock3,
                  tone: 'purple',
                  detail: 'Saldo dos serviços realizados no período',
                },
                {
                  label: 'A devolver',
                  value: summary.data.refund_due,
                  icon: RotateCcw,
                  tone: 'blue',
                  detail: 'Valores recebidos acima da cobrança no período',
                },
                {
                  label: 'Devoluções registradas',
                  value: summary.data.refunded,
                  icon: Coins,
                  tone: 'yellow',
                  detail: 'Devoluções nas datas selecionadas',
                },
              ].map(({ label, value, icon: Icon, tone, detail }) => (
                <article className="stat-card" key={label}>
                  <div>
                    <span>{label}</span>
                    <span className={`stat-icon ${tone}`}>
                      <Icon size={19} />
                    </span>
                  </div>
                  <strong>{money(value)}</strong>
                  <small>{detail}</small>
                </article>
              ))}
            </div>
            <div className="info-strip">
              <Clock3 size={20} />
              <p>
                <strong>
                  {summary.data.awaiting_count} atendimento(s) para finalizar neste período.
                </strong>{' '}
                Valores de serviços usam a data do atendimento. Recebimentos e devoluções usam a
                data em que o dinheiro foi registrado como recebido ou devolvido.{' '}
                <Link href="/app/finalizar">Conferir pendências</Link>
              </p>
            </div>
            <div className="finance-breakdowns">
              {[
                ['Por serviço', summary.data.services],
                ['Por profissional', summary.data.professionals],
              ].map(([title, rows]) => (
                <section className="panel resource-panel" key={title as string}>
                  <div className="panel-head">
                    <div>
                      <h2>{title as string}</h2>
                      <p>Somente atendimentos realizados, com os descontos aplicados.</p>
                    </div>
                  </div>
                  {(rows as FinanceOverview['services']).length ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Atendimentos</th>
                            <th>Valor realizado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(rows as FinanceOverview['services']).map((item, index) => (
                            <tr key={`${item.name}-${index}`}>
                              <td className="table-primary">{item.name}</td>
                              <td>{item.count}</td>
                              <td>{money(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      icon={Coins}
                      title="Seus resultados começam aqui."
                      description="Finalize os atendimentos realizados para acompanhar os valores."
                    />
                  )}
                </section>
              ))}
            </div>
          </>
        )
      ) : (
        <section className="panel resource-panel">
          <div className="panel-head">
            <div>
              <h2>{finalization ? 'Atendimentos para conferir' : 'Atendimentos e pagamentos'}</h2>
              <p>
                {finalization
                  ? 'Selecione até 100 para finalizar em conjunto, mantendo o valor de cada agendamento.'
                  : 'O valor recebido pode ser antecipado, parcial ou integral.'}
              </p>
            </div>
            <span className="count-tag">{records.data?.length || 0} registros</span>
          </div>
          <div className="finance-list-tools">
            <label className="finance-search">
              Buscar cliente ou serviço
              <input
                type="search"
                value={filters.search}
                placeholder="Nome do cliente ou serviço"
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </label>
            {selected.length > 0 && (
              <button
                className="button primary small"
                onClick={() => {
                  setError('');
                  setBatch(true);
                }}
              >
                <CheckCheck size={16} />
                Finalizar {selected.length} selecionado(s)
              </button>
            )}
          </div>
          {records.loading ? (
            <Loading />
          ) : records.error ? (
            <ErrorState message={records.error} retry={records.reload} />
          ) : !records.data?.length ? (
            <EmptyState
              icon={finalization ? CheckCheck : Wallet}
              title={finalization ? 'Tudo conferido por aqui.' : 'Nenhum atendimento neste filtro.'}
              description={
                finalization
                  ? 'Os próximos horários aparecem aqui depois de terminarem. Você pode ajustar os filtros para consultar outros resultados.'
                  : 'Ajuste o período ou o resultado do atendimento para encontrar seus registros.'
              }
            />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        aria-label="Selecionar até 100 atendimentos pendentes"
                        type="checkbox"
                        checked={
                          eligible.length > 0 &&
                          eligible.slice(0, 100).every((item) => selected.includes(item.id))
                        }
                        disabled={!eligible.length}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked ? eligible.slice(0, 100).map((item) => item.id) : [],
                          )
                        }
                      />
                    </th>
                    <th>Atendimento</th>
                    <th>Data</th>
                    <th>Resultado</th>
                    <th>Valor</th>
                    <th>Recebido líquido</th>
                    <th>Pagamento</th>
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.data.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {row.awaiting_finalization && (
                          <input
                            aria-label={`Selecionar atendimento de ${row.client_name}`}
                            type="checkbox"
                            checked={selected.includes(row.id)}
                            disabled={!selected.includes(row.id) && selected.length >= 100}
                            onChange={(e) =>
                              setSelected((current) =>
                                e.target.checked
                                  ? [...current, row.id]
                                  : current.filter((id) => id !== row.id),
                              )
                            }
                          />
                        )}
                      </td>
                      <td className="table-primary">
                        {row.client_name}
                        <small className="table-sub">
                          {row.service_name} · {row.professional_name}
                        </small>
                      </td>
                      <td>{dateTime(row.starts_at)}</td>
                      <td>
                        <span
                          className={`status-pill ${row.financial_state === 'completed' ? 'positive' : 'neutral'}`}
                        >
                          {attendanceLabels[row.financial_state]}
                        </span>
                      </td>
                      <td>{money(row.final_amount)}</td>
                      <td>{money(row.net_received)}</td>
                      <td>
                        <span
                          className={`status-pill ${row.payment_status === 'paid' ? 'positive' : row.payment_status === 'refund_due' ? 'negative' : 'neutral'}`}
                        >
                          {paymentLabels[row.payment_status]}
                        </span>
                        {Number(row.balance) > 0 && (
                          <small className="table-sub">Faltam {money(row.balance)}</small>
                        )}
                        {Number(row.refund_due) > 0 && (
                          <small className="table-sub">A devolver {money(row.refund_due)}</small>
                        )}
                      </td>
                      <td>
                        <button
                          className="button secondary small"
                          onClick={() =>
                            setDialog({
                              id: row.id,
                              mode:
                                finalization && row.awaiting_finalization ? 'finalize' : 'detail',
                            })
                          }
                        >
                          {finalization && row.awaiting_finalization ? 'Finalizar' : 'Ver detalhes'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {dialog && (
        <FinanceDialog
          appointmentId={dialog.id}
          initialMode={dialog.mode}
          onClose={() => setDialog(null)}
          onUpdated={reload}
        />
      )}
      {batch && (
        <Modal
          title="Conferir a finalização em lote"
          description={`${selected.length} atendimento(s) selecionado(s). Os valores individuais e os pagamentos já registrados serão preservados.`}
          onClose={() => !busy && setBatch(false)}
        >
          <div className="modal-form">
            <label>
              Resultado dos atendimentos
              <select value={batchStatus} onChange={(e) => setBatchStatus(e.target.value)}>
                <option value="completed">Serviços realizados</option>
                <option value="no_show">Clientes não compareceram</option>
                <option value="canceled">Atendimentos cancelados</option>
              </select>
            </label>
            <p className="field-hint">
              Esta ação não registra pagamentos. Para ajustar valores ou registrar um recebimento,
              abra o atendimento individualmente.
            </p>
            {batchStatus !== 'completed' && (
              <Notice message="Os atendimentos ficarão sem cobrança. Valores já recebidos serão indicados para devolução." />
            )}
            {error && <Notice error message={error} />}
            <div className="modal-footer">
              <button className="button secondary" disabled={busy} onClick={() => setBatch(false)}>
                Voltar
              </button>
              <button className="button primary" disabled={busy} onClick={finalizeBatch}>
                {busy && <LoaderCircle size={17} className="spin" />}Confirmar finalização
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
