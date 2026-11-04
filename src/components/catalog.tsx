'use client';
import { FormEvent, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import WorkHoursEditor, { WorkSlot, hoursSummary } from './work-hours-editor';
import {
  Plus,
  Users,
  Scissors,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Link2,
  Clock3,
  Copy,
  LoaderCircle,
  Check,
  X,
} from 'lucide-react';
import { api, money } from '@/lib/api';
import { PageHeader, Modal, Notice, Loading, ErrorState, SearchField, useLoad } from './ui';

type Service = {
  id: number;
  name: string;
  description: string;
  duration: number;
  sell_price: string;
};
type Person = {
  id: number;
  name: string;
  phone: string;
  email: string;
  user: number | null;
  user_name: string | null;
  availability: WorkSlot[];
  services: {
    id: number;
    service: number;
    name: string;
    duration: number;
    sell_price: string;
    custom_duration: number | null;
    custom_price: string | null;
  }[];
};
type CatalogData = {
  services: Service[];
  professionals: Person[];
  users: { id: number; name: string; email: string }[];
};
type DraftService = {
  key: string;
  name: string;
  description: string;
  duration: number;
  sell_price: string;
};
type DraftPerson = {
  key: string;
  id?: number;
  name: string;
  phone: string;
  email: string;
  user: number | null;
  services: string[];
  availability?: WorkSlot[];
  service_overrides?: Record<string, { duration: number | null; sell_price: string | null }>;
};
const blankPerson = (): DraftPerson => ({
  key: crypto.randomUUID(),
  name: '',
  phone: '',
  email: '',
  user: null,
  services: [],
});
const blankService = (): DraftService => ({
  key: crypto.randomUUID(),
  name: '',
  description: '',
  duration: 30,
  sell_price: '',
});

export default function Catalog() {
  const state = useLoad(() => api<CatalogData>('catalog/'));
  const [tab, setTab] = useState<'people' | 'services'>('people');
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState<DraftPerson[] | null>(null);
  const [draftServices, setDraftServices] = useState<DraftService[]>([]);
  const [quick, setQuick] = useState<{ person: string; service: DraftService } | null>(null);
  const [serviceEditor, setServiceEditor] = useState<(DraftService & { id?: number }) | null>(null);
  const [deleting, setDeleting] = useState<{
    kind: 'professionals' | 'services';
    id: number;
    name: string;
  } | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const operation = useRef<{ body: string; id: string } | null>(null);
  function operationId(body: unknown) {
    const value = JSON.stringify(body);
    if (operation.current?.body !== value)
      operation.current = { body: value, id: crypto.randomUUID() };
    return operation.current!.id;
  }
  function openPeople(person?: Person) {
    setError('');
    setQuick(null);
    setDraftServices([]);
    operation.current = null;
    setPeople(
      person
        ? [
            {
              key: crypto.randomUUID(),
              id: person.id,
              name: person.name,
              phone: person.phone,
              email: person.email,
              user: person.user,
              services: person.services.map((s) => String(s.service)),
              availability: person.availability,
              service_overrides: Object.fromEntries(
                person.services.map((service) => [
                  String(service.service),
                  { duration: service.custom_duration, sell_price: service.custom_price },
                ]),
              ),
            },
          ]
        : [blankPerson()],
    );
  }
  function updatePerson(key: string, values: Partial<DraftPerson>) {
    setPeople((current) => current?.map((p) => (p.key === key ? { ...p, ...values } : p)) || null);
  }
  async function savePeople(event: FormEvent) {
    event.preventDefault();
    if (!people || busy) return;
    if (quick) {
      setError('Adicione o novo serviço à seleção ou cancele a criação dele antes de salvar.');
      return;
    }
    const payload = {
      services: draftServices,
      professionals: people.map(({ key, ...p }) => ({
        ...p,
        service_overrides: Object.fromEntries(
          Object.entries(p.service_overrides || {}).filter(([ref]) => p.services.includes(ref)),
        ),
      })),
    };
    setBusy(true);
    setError('');
    try {
      await api('catalog/setup/', {
        method: 'POST',
        body: JSON.stringify({ ...payload, request_id: operationId(payload) }),
      });
      setPeople(null);
      setNotice('Tudo pronto. Profissionais e serviços salvos juntos.');
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }
  function addQuick() {
    if (!quick) return;
    if (
      !quick.service.name.trim() ||
      !Number.isInteger(quick.service.duration) ||
      quick.service.duration < 1 ||
      !quick.service.sell_price ||
      Number(quick.service.sell_price) < 0
    ) {
      setError('Preencha nome, duração e preço do serviço.');
      return;
    }
    setDraftServices((current) => [
      ...current,
      { ...quick.service, name: quick.service.name.trim() },
    ]);
    const person = people?.find((p) => p.key === quick.person);
    if (person) updatePerson(person.key, { services: [...person.services, quick.service.key] });
    setQuick(null);
    setError('');
  }
  async function saveService(event: FormEvent) {
    event.preventDefault();
    if (!serviceEditor || busy) return;
    setBusy(true);
    setError('');
    try {
      const { id, key, ...fields } = serviceEditor;
      if (id) await api(`services/${id}/`, { method: 'PATCH', body: JSON.stringify(fields) });
      else {
        const payload = { services: [{ key, ...fields }], professionals: [] };
        await api('catalog/setup/', {
          method: 'POST',
          body: JSON.stringify({ ...payload, request_id: operationId(payload) }),
        });
      }
      setServiceEditor(null);
      setNotice('Serviço salvo e disponível para associar aos profissionais.');
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setError('');
    try {
      await api(`${deleting.kind}/${deleting.id}/`, { method: 'DELETE' });
      setDeleting(null);
      setNotice('Cadastro excluído.');
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir.');
    } finally {
      setBusy(false);
    }
  }
  const serviceOptions = useMemo(
    () => [
      ...(state.data?.services.map((s) => ({
        ref: String(s.id),
        name: s.name,
        duration: s.duration,
        sell_price: s.sell_price,
        isNew: false,
      })) || []),
      ...draftServices.map((s) => ({
        ref: s.key,
        name: s.name,
        duration: s.duration,
        sell_price: s.sell_price,
        isNew: true,
      })),
    ],
    [state.data, draftServices],
  );
  const matches = (value: string) =>
    value.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'));
  return (
    <>
      <PageHeader
        eyebrow="MENOS ETAPAS. MAIS TEMPO PARA ATENDER."
        title="Profissionais e serviços, juntos."
        description="Cadastre sua equipe e associe vários serviços de uma só vez."
      >
        <button
          className="button secondary"
          onClick={() => {
            setError('');
            operation.current = null;
            setServiceEditor(blankService());
          }}
        >
          <Scissors size={17} />
          Novo serviço
        </button>
        <button className="button primary" onClick={() => openPeople()}>
          <Plus size={18} />
          Cadastrar e associar
        </button>
      </PageHeader>
      {notice && <Notice message={notice} />}
      <div className="catalog-toolbar">
        <div className="catalog-tabs" role="group" aria-label="Visualização do cadastro">
          <button className={tab === 'people' ? 'active' : ''} onClick={() => setTab('people')}>
            <Users size={17} />
            Profissionais <span>{state.data?.professionals.length || 0}</span>
          </button>
          <button className={tab === 'services' ? 'active' : ''} onClick={() => setTab('services')}>
            <Scissors size={17} />
            Serviços <span>{state.data?.services.length || 0}</span>
          </button>
        </div>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Buscar profissional ou serviço..."
        />
      </div>
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorState message={state.error} retry={state.reload} />
      ) : (
        state.data && (
          <>
            {tab === 'people' ? (
              <div className="catalog-people">
                {state.data.professionals
                  .filter((p) => matches(p.name + ' ' + p.services.map((s) => s.name).join(' ')))
                  .map((person) => (
                    <article className="panel catalog-person" key={person.id}>
                      <div className="catalog-person-head">
                        <span className="catalog-person-avatar">
                          {person.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <h2>{person.name}</h2>
                          <span>
                            {person.services.length}{' '}
                            {person.services.length === 1
                              ? 'serviço associado'
                              : 'serviços associados'}
                          </span>
                        </div>
                        <button
                          className="icon-button"
                          onClick={() => openPeople(person)}
                          aria-label={`Editar ${person.name}`}
                        >
                          <Pencil size={17} />
                        </button>
                      </div>
                      <div className="catalog-contact">
                        {person.phone && (
                          <span>
                            <Phone size={14} />
                            {person.phone}
                          </span>
                        )}
                        {person.email && (
                          <span>
                            <Mail size={14} />
                            {person.email}
                          </span>
                        )}
                        <span>
                          <Link2 size={14} />
                          {person.user
                            ? `Avisos por e-mail: ${person.user_name || 'usuário vinculado'}`
                            : 'Sem usuário vinculado para e-mails'}
                        </span>
                      </div>
                      <div className="catalog-chips">
                        {person.services.map((s) => (
                          <span key={s.id}>{s.name}</span>
                        ))}
                        {!person.services.length && (
                          <p>Associe serviços para disponibilizar este profissional na agenda.</p>
                        )}
                      </div>
                      <Link
                        className="catalog-hours-link"
                        href={`/app/expedientes?professional=${person.id}`}
                      >
                        <Clock3 size={14} />
                        {hoursSummary(person.availability)}
                        <span>Ajustar</span>
                      </Link>
                      <div className="catalog-person-footer">
                        <button className="text-link" onClick={() => openPeople(person)}>
                          Gerenciar serviços <Pencil size={13} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Excluir ${person.name}`}
                          onClick={() => {
                            setError('');
                            setDeleting({
                              kind: 'professionals',
                              id: person.id,
                              name: person.name,
                            });
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            ) : (
              <section className="panel catalog-service-table">
                {state.data.services
                  .filter((s) => matches(s.name))
                  .map((service) => (
                    <article className="catalog-service-row" key={service.id}>
                      <span className="catalog-service-icon">
                        <Scissors size={19} />
                      </span>
                      <div>
                        <strong>{service.name}</strong>
                        <small>
                          {service.duration} min · {money(service.sell_price)}
                        </small>
                        {service.description && <p>{service.description}</p>}
                      </div>
                      <button
                        className="button secondary small"
                        onClick={() => {
                          setError('');
                          setServiceEditor({ ...service, key: crypto.randomUUID() });
                        }}
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Excluir ${service.name}`}
                        onClick={() => {
                          setError('');
                          setDeleting({ kind: 'services', id: service.id, name: service.name });
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </article>
                  ))}
              </section>
            )}
            {!(tab === 'people'
              ? state.data.professionals.some((p) =>
                  matches(p.name + ' ' + p.services.map((s) => s.name).join(' ')),
                )
              : state.data.services.some((s) => matches(s.name))) && (
              <div className="catalog-empty panel">
                <Users size={32} />
                <h2>{search ? 'Nenhum resultado por aqui.' : 'Vamos preparar sua equipe?'}</h2>
                <p>Adicione profissionais, crie serviços e faça as associações na mesma tela.</p>
                <button className="button primary" onClick={() => openPeople()}>
                  Cadastrar e associar
                  <Plus size={17} />
                </button>
              </div>
            )}
          </>
        )
      )}
      {people && state.data && (
        <Modal
          title={
            people.some((p) => p.id)
              ? 'Profissional e seus serviços'
              : 'Monte sua equipe de uma vez'
          }
          description="Adicione quantos profissionais precisar e marque os serviços de cada um. Tudo será salvo junto."
          onClose={() => {
            if (!busy) setPeople(null);
          }}
        >
          <form onSubmit={savePeople} className="modal-form catalog-setup-form">
            <fieldset disabled={busy}>
              {people.map((person, index) => (
                <section className="catalog-draft-person" key={person.key}>
                  <div className="catalog-draft-head">
                    <strong>
                      {person.id ? 'Editar profissional' : `Profissional ${index + 1}`}
                    </strong>
                    {people.length > 1 && (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remover profissional ${index + 1} deste cadastro`}
                        onClick={() => {
                          setPeople(people.filter((p) => p.key !== person.key));
                          if (quick?.person === person.key) setQuick(null);
                        }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="form-grid">
                    <label className="wide">
                      Nome
                      <input
                        value={person.name}
                        onChange={(e) => updatePerson(person.key, { name: e.target.value })}
                        required
                        maxLength={255}
                        placeholder="Ex.: Ana Costa"
                      />
                    </label>
                    <label>
                      Telefone <small>opcional</small>
                      <input
                        type="tel"
                        value={person.phone}
                        onChange={(e) => updatePerson(person.key, { phone: e.target.value })}
                        maxLength={30}
                        placeholder="DDD + número"
                      />
                    </label>
                    <label>
                      E-mail <small>opcional</small>
                      <input
                        type="email"
                        value={person.email}
                        onChange={(e) => updatePerson(person.key, { email: e.target.value })}
                        maxLength={254}
                        placeholder="contato@exemplo.com"
                      />
                    </label>
                    <label className="wide">
                      Usuário que recebe e-mails da agenda
                      <select
                        value={person.user ?? ''}
                        onChange={(e) =>
                          updatePerson(person.key, {
                            user: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      >
                        <option value="">Não vincular um usuário</option>
                        {person.user && !state.data!.users.some((u) => u.id === person.user) && (
                          <option value={person.user}>Usuário inativo — escolha outro</option>
                        )}
                        {state.data!.users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email} · {user.email}
                          </option>
                        ))}
                      </select>
                      <small>
                        Escolha um usuário desta empresa com e-mail confirmado. Os demais avisos
                        continuam na plataforma.
                      </small>
                    </label>
                  </div>
                  <details className="catalog-work-hours">
                    <summary>
                      <Clock3 size={16} />
                      Expediente <span>{hoursSummary(person.availability || [])}</span>
                    </summary>
                    <WorkHoursEditor
                      value={person.availability || []}
                      onChange={(availability) => updatePerson(person.key, { availability })}
                    />
                  </details>
                  <ServiceSelector
                    options={serviceOptions}
                    selected={person.services}
                    onChange={(services) => updatePerson(person.key, { services })}
                  />
                  {person.services.length > 0 && (
                    <details className="catalog-work-hours catalog-custom-prices">
                      <summary>
                        <Pencil size={14} />
                        Personalizar duração e preço <span>opcional</span>
                      </summary>
                      <div className="catalog-custom-prices-fields">
                        {person.services.map((ref) => {
                          const service = serviceOptions.find((item) => item.ref === ref);
                          if (!service) return null;
                          const custom = person.service_overrides?.[ref] || {
                            duration: null,
                            sell_price: null,
                          };
                          return (
                            <div key={ref}>
                              <strong>{service.name}</strong>
                              <div className="form-grid">
                                <label>
                                  Duração específica (min)
                                  <input
                                    type="number"
                                    min={1}
                                    max={1440}
                                    step={1}
                                    placeholder={String(service.duration)}
                                    value={custom.duration ?? ''}
                                    onChange={(e) =>
                                      updatePerson(person.key, {
                                        service_overrides: {
                                          ...person.service_overrides,
                                          [ref]: {
                                            ...custom,
                                            duration: e.target.value
                                              ? Number(e.target.value)
                                              : null,
                                          },
                                        },
                                      })
                                    }
                                  />
                                </label>
                                <label>
                                  Preço específico (R$)
                                  <input
                                    type="number"
                                    min={0}
                                    max={99999999.99}
                                    step="0.01"
                                    placeholder={service.sell_price}
                                    value={custom.sell_price ?? ''}
                                    onChange={(e) =>
                                      updatePerson(person.key, {
                                        service_overrides: {
                                          ...person.service_overrides,
                                          [ref]: { ...custom, sell_price: e.target.value || null },
                                        },
                                      })
                                    }
                                  />
                                </label>
                              </div>
                            </div>
                          );
                        })}
                        <p>
                          Deixe em branco para usar os valores do serviço. Agendamentos já criados
                          mantêm o valor original.
                        </p>
                      </div>
                    </details>
                  )}
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setQuick({ person: person.key, service: blankService() })}
                  >
                    <Plus size={15} />
                    Criar serviço aqui mesmo
                  </button>
                  {quick?.person === person.key && (
                    <div className="catalog-inline-service">
                      <strong>Novo serviço para a seleção</strong>
                      <ServiceFields
                        value={quick.service}
                        onChange={(service) => setQuick({ ...quick, service })}
                      />
                      <div className="catalog-inline-actions">
                        <button
                          type="button"
                          className="button secondary small"
                          onClick={() => setQuick(null)}
                        >
                          Cancelar
                        </button>
                        <button type="button" className="button primary small" onClick={addQuick}>
                          <Check size={15} />
                          Adicionar à seleção
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              ))}
              {!people.some((p) => p.id) && people.length < 30 && (
                <button
                  type="button"
                  className="button secondary catalog-add-person"
                  onClick={() => setPeople([...people, blankPerson()])}
                >
                  <Plus size={16} />
                  Adicionar outro profissional
                </button>
              )}
            </fieldset>
            {error && <Notice error message={error} />}
            {people.length > 1 && people[0].availability !== undefined && (
              <button
                type="button"
                className="text-link"
                disabled={busy}
                onClick={() =>
                  setPeople(
                    people.map((person) => ({
                      ...person,
                      availability: people[0].availability!.map((slot) => ({ ...slot })),
                    })),
                  )
                }
              >
                <Copy size={15} />
                Copiar expediente do primeiro para todos
              </button>
            )}
            <div className="catalog-save-summary">
              {people.length} {people.length === 1 ? 'profissional' : 'profissionais'} ·{' '}
              {people.reduce((n, p) => n + p.services.length, 0)} vínculos · {draftServices.length}{' '}
              serviços novos
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setPeople(null)}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={17} />}
                {busy ? 'Salvando tudo...' : 'Salvar tudo junto'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {serviceEditor && (
        <Modal
          title={serviceEditor.id ? 'Editar serviço' : 'Novo serviço'}
          description="O serviço ficará disponível para associar a vários profissionais."
          onClose={() => {
            if (!busy) setServiceEditor(null);
          }}
        >
          <form className="modal-form" onSubmit={saveService}>
            <fieldset disabled={busy}>
              <ServiceFields
                value={serviceEditor}
                onChange={(fields) => setServiceEditor({ ...serviceEditor, ...fields })}
              />
            </fieldset>
            {error && <Notice error message={error} />}
            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setServiceEditor(null)}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? 'Salvando...' : 'Salvar serviço'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title={`Excluir ${deleting.name}?`}
          description={
            deleting.kind === 'services'
              ? 'O serviço sairá do cadastro. Os agendamentos existentes, valores e horários serão preservados.'
              : 'Profissionais com agendamentos não podem ser excluídos para preservar o histórico.'
          }
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          {error && <Notice error message={error} />}
          <div className="modal-footer">
            <button className="button secondary" disabled={busy} onClick={() => setDeleting(null)}>
              Manter cadastro
            </button>
            <button className="button danger" disabled={busy} onClick={remove}>
              {busy ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function ServiceFields({
  value,
  onChange,
}: {
  value: DraftService;
  onChange: (value: DraftService) => void;
}) {
  return (
    <div className="form-grid">
      <label className="wide">
        Nome do serviço
        <input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          maxLength={255}
          required
        />
      </label>
      <label>
        Duração em minutos
        <input
          type="number"
          min={1}
          max={1440}
          step={1}
          value={value.duration}
          onChange={(e) => onChange({ ...value, duration: Number(e.target.value) })}
          required
        />
      </label>
      <label>
        Preço em reais
        <input
          type="number"
          min={0}
          max={99999999.99}
          step="0.01"
          value={value.sell_price}
          onChange={(e) => onChange({ ...value, sell_price: e.target.value })}
          required
        />
      </label>
      <label className="wide">
        Descrição <small>opcional</small>
        <textarea
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          maxLength={4000}
        />
      </label>
    </div>
  );
}
function ServiceSelector({
  options,
  selected,
  onChange,
}: {
  options: { ref: string; name: string; duration: number; sell_price: string; isNew: boolean }[];
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = options.filter((s) =>
    s.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')),
  );
  return (
    <div className="catalog-selector">
      <div className="catalog-selector-head">
        <strong>
          Serviços deste profissional <span>{selected.length}</span>
        </strong>
        <button
          type="button"
          className="text-link"
          onClick={() =>
            onChange(
              filtered.every((s) => selected.includes(s.ref))
                ? selected.filter((ref) => !filtered.some((s) => s.ref === ref))
                : [...new Set([...selected, ...filtered.map((s) => s.ref)])],
            )
          }
        >
          {filtered.length && filtered.every((s) => selected.includes(s.ref))
            ? 'Desmarcar'
            : 'Selecionar'}{' '}
          todos
        </button>
      </div>
      {options.length > 5 && (
        <input
          aria-label="Filtrar serviços"
          placeholder="Filtrar serviços..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      <div className="catalog-service-options">
        {filtered.map((service) => (
          <label
            className={`catalog-service-option ${selected.includes(service.ref) ? 'selected' : ''}`}
            key={service.ref}
          >
            <input
              type="checkbox"
              checked={selected.includes(service.ref)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...selected, service.ref]
                    : selected.filter((s) => s !== service.ref),
                )
              }
            />
            <span>
              <strong>
                {service.name}
                {service.isNew && <em>Novo</em>}
              </strong>
              <small>
                {service.duration} min · {money(service.sell_price)}
              </small>
            </span>
          </label>
        ))}
        {!filtered.length && (
          <p>
            {options.length
              ? 'Nenhum serviço encontrado.'
              : 'Crie o primeiro serviço abaixo e já associe ao profissional.'}
          </p>
        )}
      </div>
      <small>Ao desmarcar um serviço, os agendamentos existentes continuam preservados.</small>
    </div>
  );
}
