'use client';
import { useState, FormEvent } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  LoaderCircle,
  Users,
  Scissors,
  Clock3,
  ContactRound,
  Ban,
  Link2,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { api, list, money, dateTime } from '@/lib/api';
import {
  PageHeader,
  Loading,
  ErrorState,
  EmptyState,
  SearchField,
  Modal,
  Notice,
  useLoad,
} from './ui';

type Row = Record<string, string | number | boolean | null> & { id: number };
type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  source?: string;
  optional?: boolean;
  min?: number;
  step?: string;
};
type Config = {
  endpoint: string;
  title: string;
  singular: string;
  description: string;
  empty: string;
  icon: typeof Users;
  fields: Field[];
  columns: {
    key: string;
    label: string;
    format?: (value: Row[string], row: Row) => React.ReactNode;
  }[];
  note?: React.ReactNode;
};
const weekdays = [
  { value: 'monday', label: 'Segunda-feira' },
  { value: 'tuesday', label: 'Terça-feira' },
  { value: 'wednesday', label: 'Quarta-feira' },
  { value: 'thursday', label: 'Quinta-feira' },
  { value: 'friday', label: 'Sexta-feira' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];
const name: Field = {
  name: 'name',
  label: 'Nome',
  required: true,
  placeholder: 'Como ele aparece no atendimento?',
};
const pro: Field = {
  name: 'professional',
  label: 'Profissional',
  source: 'professionals',
  required: true,
};
export const configs: Record<string, Config> = {
  servicos: {
    endpoint: 'services',
    title: 'Seus serviços, bem apresentados.',
    singular: 'serviço',
    description: 'O que seu negócio faz de melhor, com valor e duração definidos.',
    empty: 'Cadastre o primeiro serviço para começar a organizar seus agendamentos.',
    icon: Scissors,
    fields: [
      name,
      {
        name: 'description',
        label: 'Descrição',
        type: 'textarea',
        placeholder: 'Explique o que está incluído no serviço.',
      },
      {
        name: 'sell_price',
        label: 'Preço (R$)',
        type: 'number',
        required: true,
        min: 0,
        step: '0.01',
        placeholder: '80,00',
      },
      {
        name: 'duration',
        label: 'Duração em minutos',
        type: 'number',
        required: true,
        min: 1,
        placeholder: '45',
      },
    ],
    columns: [
      { key: 'name', label: 'Serviço' },
      { key: 'description', label: 'Descrição' },
      { key: 'duration', label: 'Duração', format: (v) => `${v} min` },
      { key: 'sell_price', label: 'Preço', format: (v) => money(String(v)) },
    ],
  },
  profissionais: {
    endpoint: 'professionals',
    title: 'Quem faz acontecer.',
    singular: 'profissional',
    description: 'Sua equipe é parte da experiência. Apresente cada profissional.',
    empty: 'Cadastre um profissional e depois vincule os serviços e horários de atendimento.',
    icon: Users,
    fields: [{ ...name, label: 'Nome do profissional', placeholder: 'Ex.: Julia Martins' }],
    columns: [{ key: 'name', label: 'Profissional' }],
    note: (
      <span>
        Depois do cadastro, configure os <Link href="/app/vinculos">serviços por profissional</Link>{' '}
        e seus <Link href="/app/expedientes">expedientes</Link>.
      </span>
    ),
  },
  clientes: {
    endpoint: 'clients',
    title: 'Cada cliente, uma boa conexão.',
    singular: 'cliente',
    description: 'Encontre os contatos que já fazem parte da história do seu negócio.',
    empty: 'Os clientes das conversas aparecem aqui. Você também pode cadastrar um contato.',
    icon: ContactRound,
    fields: [
      { ...name, label: 'Nome do cliente' },
      {
        name: 'phone',
        label: 'WhatsApp com país e DDD',
        type: 'tel',
        required: true,
        placeholder: '5585999999999',
      },
    ],
    columns: [
      { key: 'name', label: 'Cliente' },
      { key: 'phone', label: 'WhatsApp' },
    ],
  },
  vinculos: {
    endpoint: 'offerings',
    title: 'O serviço certo. A pessoa certa.',
    singular: 'vínculo',
    description: 'Defina os serviços realizados por cada profissional e suas condições.',
    empty: 'Vincule um serviço a um profissional para habilitar os agendamentos.',
    icon: Link2,
    fields: [
      pro,
      { name: 'service', label: 'Serviço', source: 'services', required: true },
      {
        name: 'duration',
        label: 'Duração específica em minutos',
        type: 'number',
        optional: true,
        min: 1,
        placeholder: 'Usar a duração do serviço',
      },
      {
        name: 'sell_price',
        label: 'Preço específico (R$)',
        type: 'number',
        optional: true,
        min: 0,
        step: '0.01',
        placeholder: 'Usar o preço do serviço',
      },
    ],
    columns: [
      { key: 'professional_name', label: 'Profissional' },
      { key: 'service_name', label: 'Serviço' },
      { key: 'effective_duration', label: 'Duração', format: (v) => `${v} min` },
      { key: 'effective_sell_price', label: 'Preço', format: (v) => money(String(v)) },
    ],
    note: (
      <>Deixe preço e duração específicos em branco para usar os valores cadastrados no serviço.</>
    ),
  },
  expedientes: {
    endpoint: 'availability',
    title: 'Cada dia, no seu ritmo.',
    singular: 'expediente',
    description: 'Defina quando cada profissional está disponível para atender.',
    empty:
      'Cadastre os dias e intervalos de trabalho. Para uma pausa de almoço, use dois intervalos no mesmo dia.',
    icon: Clock3,
    fields: [
      pro,
      { name: 'weekday', label: 'Dia da semana', options: weekdays, required: true },
      { name: 'start_time', label: 'Abertura', type: 'time', required: true },
      { name: 'end_time', label: 'Encerramento', type: 'time', required: true },
    ],
    columns: [
      {
        key: 'professional',
        label: 'Profissional',
        format: (v, row) => row._professional_name || v,
      },
      {
        key: 'weekday',
        label: 'Dia da semana',
        format: (v) => weekdays.find((w) => w.value === v)?.label || v,
      },
      { key: 'start_time', label: 'Início', format: (v) => String(v).slice(0, 5) },
      { key: 'end_time', label: 'Fim', format: (v) => String(v).slice(0, 5) },
    ],
    note: (
      <>
        Horários de Fortaleza (UTC−3). Agendamentos são permitidos apenas dentro dos expedientes
        cadastrados.
      </>
    ),
  },
  bloqueios: {
    endpoint: 'blocks',
    title: 'Espaço para os imprevistos.',
    singular: 'bloqueio',
    description: 'Reserve intervalos que não devem receber novos agendamentos.',
    empty: 'Férias, compromissos e pausas podem ser organizados como bloqueios de horário.',
    icon: Ban,
    fields: [
      pro,
      { name: 'starts_at', label: 'Início', type: 'datetime-local', required: true },
      { name: 'ends_at', label: 'Fim', type: 'datetime-local', required: true },
      {
        name: 'reason',
        label: 'Motivo',
        type: 'textarea',
        placeholder: 'Ex.: Compromisso pessoal',
      },
    ],
    columns: [
      { key: 'professional_name', label: 'Profissional' },
      { key: 'starts_at', label: 'Início', format: (v) => dateTime(String(v)) },
      { key: 'ends_at', label: 'Fim', format: (v) => dateTime(String(v)) },
      { key: 'reason', label: 'Motivo' },
    ],
    note: (
      <>
        Horários de Fortaleza (UTC−3). Remarque os agendamentos existentes antes de bloquear um
        intervalo ocupado.
      </>
    ),
  },
};
function localInput(value: string) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
  return parts.replace(' ', 'T');
}
export default function Resources({ section }: { section: string }) {
  const config = configs[section];
  const [search, setSearch] = useState(''),
    [editing, setEditing] = useState<Row | true | null>(null),
    [deleting, setDeleting] = useState<Row | null>(null),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState(''),
    [notice, setNotice] = useState('');
  const state = useLoad(async () => {
    const rows = await list<Row>(`${config.endpoint}/`);
    const sources = [...new Set(config.fields.map((f) => f.source).filter(Boolean) as string[])];
    if (section === 'expedientes' && !sources.includes('professionals'))
      sources.push('professionals');
    const options: Record<string, Row[]> = {};
    await Promise.all(
      sources.map(async (source) => {
        options[source] = await list<Row>(`${source}/`);
      }),
    );
    return {
      rows: rows.map((row): Row => ({
        ...row,
        _professional_name:
          options.professionals?.find((p) => p.id === row.professional)?.name || '',
      })),
      options,
    };
  }, [section]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    const input = Object.fromEntries(new FormData(event.currentTarget));
    const body: Record<string, unknown> = {};
    config.fields.forEach((field) => {
      const value = String(input[field.name] || '');
      body[field.name] =
        field.optional && !value
          ? null
          : field.source
            ? Number(value)
            : field.type === 'number'
              ? value
              : field.type === 'datetime-local' && value
                ? `${value}:00-03:00`
                : value;
    });
    try {
      const id = editing !== true && editing ? editing.id : null;
      await api(`${config.endpoint}/${id ? `${id}/` : ''}`, {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      setEditing(null);
      setNotice(
        `${config.singular[0].toUpperCase() + config.singular.slice(1)} ${id ? 'atualizado' : 'cadastrado'} com sucesso.`,
      );
      state.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setFormError('');
    try {
      await api(`${config.endpoint}/${deleting.id}/`, { method: 'DELETE' });
      setDeleting(null);
      setNotice('Registro excluído.');
      state.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível excluir.');
    } finally {
      setBusy(false);
    }
  }
  const filtered =
    state.data?.rows.filter((row) =>
      config.columns.some((col) =>
        String(row[col.key] ?? '')
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    ) || [];
  const open = (row: Row | true) => {
    setEditing(row);
    setFormError('');
  };
  return (
    <>
      <PageHeader
        eyebrow="MEU NEGÓCIO, BEM ORGANIZADO"
        title={config.title}
        description={config.description}
      >
        <button className="button primary small" onClick={() => open(true)}>
          <Plus size={17} />
          Adicionar {config.singular}
        </button>
      </PageHeader>
      {notice && <Notice message={notice} />}
      {config.note && (
        <div className="info-strip">
          <config.icon size={19} />
          <p>{config.note}</p>
        </div>
      )}
      <section className="panel resource-panel">
        <div className="resource-toolbar">
          <div>
            <h2>
              {config.singular === 'vínculo'
                ? 'Serviços por profissional'
                : config.singular === 'expediente'
                  ? 'Horários de atendimento'
                  : config.title.split(',')[0].replace('.', '')}
            </h2>
            <span className="count-tag">{state.data?.rows.length ?? 0} registros</span>
          </div>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder={`Buscar ${config.singular}...`}
          />
        </div>
        {state.loading ? (
          <Loading />
        ) : state.error ? (
          <ErrorState message={state.error} retry={state.reload} />
        ) : !filtered.length ? (
          <EmptyState
            icon={config.icon}
            title={
              search ? 'Nenhum resultado por aqui.' : `Seu primeiro ${config.singular} começa aqui.`
            }
            description={search ? 'Experimente buscar por outro termo.' : config.empty}
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {config.columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    {config.columns.map((col, i) => (
                      <td key={col.key} className={i === 0 ? 'table-primary' : ''}>
                        {col.format ? col.format(row[col.key], row) : String(row[col.key] || '—')}
                      </td>
                    ))}
                    <td className="table-actions">
                      <button
                        className="icon-button"
                        aria-label={`Editar ${config.singular}`}
                        onClick={() => open(row)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button danger-icon"
                        aria-label={`Excluir ${config.singular}`}
                        onClick={() => {
                          setDeleting(row);
                          setFormError('');
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editing && (
        <Modal
          title={`${editing === true ? 'Adicionar' : 'Editar'} ${config.singular}`}
          description="Informações claras fazem o atendimento fluir."
          onClose={() => !busy && setEditing(null)}
        >
          <form onSubmit={save} className="modal-form">
            <div className="form-grid">
              {config.fields.map((field) => {
                let value = editing !== true ? editing[field.name] : '';
                if (field.type === 'datetime-local' && value) value = localInput(String(value));
                return (
                  <label key={field.name} className={field.type === 'textarea' ? 'wide' : ''}>
                    {field.label}
                    {field.optional && <span className="optional">Opcional</span>}
                    {field.source || field.options ? (
                      <select
                        name={field.name}
                        required={field.required}
                        defaultValue={String(value ?? '')}
                      >
                        <option value="">Selecione...</option>
                        {(
                          field.options ||
                          state.data?.options[field.source!]?.map((row) => ({
                            value: String(row.id),
                            label: String(row.name),
                          })) ||
                          []
                        ).map((option) => (
                          <option value={option.value} key={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        name={field.name}
                        defaultValue={String(value ?? '')}
                        rows={4}
                        placeholder={field.placeholder}
                        maxLength={5000}
                      />
                    ) : (
                      <input
                        name={field.name}
                        type={field.type || 'text'}
                        defaultValue={String(value ?? '')}
                        required={field.required}
                        placeholder={field.placeholder}
                        min={field.min}
                        step={field.step}
                        maxLength={field.type === 'tel' ? 20 : 255}
                      />
                    )}
                  </label>
                );
              })}
            </div>
            {config.fields.some(
              (field) => field.source && !state.data?.options[field.source]?.length,
            ) && (
              <div className="info-strip">
                <p>
                  Cadastre primeiro os <Link href="/app/servicos">serviços</Link> e{' '}
                  <Link href="/app/profissionais">profissionais</Link> para preencher os vínculos.
                </p>
              </div>
            )}
            {formError && <Notice error message={formError} />}
            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? <LoaderCircle className="spin" size={17} /> : null}Salvar {config.singular}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title={`Excluir ${config.singular}?`}
          description="Esta ação remove o cadastro selecionado. Confira os vínculos antes de continuar."
          onClose={() => !busy && setDeleting(null)}
        >
          {formError && <Notice error message={formError} />}
          <div className="modal-footer">
            <button className="button secondary" onClick={() => setDeleting(null)} disabled={busy}>
              Manter registro
            </button>
            <button className="button danger" onClick={remove} disabled={busy}>
              {busy ? 'Excluindo...' : 'Excluir registro'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
