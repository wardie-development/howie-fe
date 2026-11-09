'use client';

import { FormEvent, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  LoaderCircle,
  Plus,
  Scissors,
  Users,
  X,
} from 'lucide-react';
import { api, money } from '@/lib/api';
import { Modal, Notice } from './ui';
import WorkHoursEditor, { WorkSlot, hoursSummary } from './work-hours-editor';

type Service = {
  id: number;
  name: string;
  description: string;
  duration: number;
  sell_price: string;
};
export type Person = {
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
export type CatalogData = {
  services: Service[];
  professionals: Person[];
  users: { id: number; name: string; email: string }[];
};
export type DraftService = {
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
export const blankService = (): DraftService => ({
  key: crypto.randomUUID(),
  name: '',
  description: '',
  duration: 30,
  sell_price: '',
});

type Section = 'people' | 'services' | 'hours';
type ServiceOption = {
  ref: string;
  name: string;
  duration: number;
  sell_price: string;
  isNew: boolean;
};
const sections = [
  { id: 'people', title: 'Equipe', icon: Users },
  { id: 'services', title: 'Serviços', icon: Scissors },
  { id: 'hours', title: 'Expediente', icon: Clock3 },
] as const;

function startDraft(person?: Person): DraftPerson {
  if (!person) return blankPerson();
  return {
    key: String(person.id),
    id: person.id,
    name: person.name,
    phone: person.phone,
    email: person.email,
    user: person.user,
    services: person.services.map((service) => String(service.service)),
    service_overrides: Object.fromEntries(
      person.services.map((service) => [
        String(service.service),
        { duration: service.custom_duration, sell_price: service.custom_price },
      ]),
    ),
  };
}

export default function CatalogEditor({
  data,
  person,
  initialSection,
  onClose,
  onSaved,
}: {
  data: CatalogData;
  person?: Person;
  initialSection: Section;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [people, setPeople] = useState(() => [startDraft(person)]);
  const [section, setSection] = useState(initialSection);
  const [selectedKey, setSelectedKey] = useState('');
  const [separateHours, setSeparateHours] = useState(false);
  const [draftServices, setDraftServices] = useState<DraftService[]>([]);
  const [newService, setNewService] = useState<DraftService | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const operation = useRef<{ body: string; id: string } | null>(null);
  const nextFocus = useRef<HTMLDivElement>(null);
  const saving = useRef(false);

  const current = people.find((item) => item.key === selectedKey) || people[0];
  const sharedHours = !person && people.length > 1 && !separateHours;
  const hours =
    (sharedHours ? people[0].availability : current.availability) ?? person?.availability ?? [];
  const step = sections.findIndex((item) => item.id === section);
  const totalLinks = people.reduce((sum, item) => sum + item.services.length, 0);
  const missingSchedule = people.filter(
    (item) => !(item.availability ?? person?.availability ?? []).length,
  );
  const serviceOptions: ServiceOption[] = [
    ...data.services.map((service) => ({ ...service, ref: String(service.id), isNew: false })),
    ...draftServices.map((service) => ({ ...service, ref: service.key, isNew: true })),
  ];

  function update(key: string, changes: Partial<DraftPerson>) {
    setPeople((items) => items.map((item) => (item.key === key ? { ...item, ...changes } : item)));
  }

  function move(target: Section) {
    setSection(target);
    setError('');
    requestAnimationFrame(() => nextFocus.current?.focus({ preventScroll: true }));
  }

  function addService() {
    if (!newService) return;
    if (
      !newService.name.trim() ||
      !Number.isInteger(newService.duration) ||
      newService.duration < 1 ||
      newService.duration > 1440 ||
      !newService.sell_price ||
      !/^\d{1,8}(?:\.\d{1,2})?$/.test(newService.sell_price)
    ) {
      setError('Informe um nome, uma duração de 1 a 1440 minutos e um preço válido.');
      return;
    }
    setDraftServices((items) => [...items, { ...newService, name: newService.name.trim() }]);
    update(current.key, { services: [...current.services, newService.key] });
    setNewService(null);
    setError('');
  }

  function changeHours(value: WorkSlot[]) {
    if (sharedHours) setPeople((items) => items.map((item) => ({ ...item, availability: value })));
    else update(current.key, { availability: value });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving.current) return;
    if (newService) {
      addService();
      return;
    }

    const invalidPerson = people.find(
      (item) =>
        !item.name.trim() ||
        (item.phone.trim() && !/^\+?[0-9 ()-]{7,30}$/.test(item.phone.trim())) ||
        (item.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email.trim())) ||
        (item.user && !data.users.some((user) => user.id === item.user)),
    );
    if (invalidPerson) {
      move('people');
      setError(
        'Confira o nome, os contatos opcionais e o usuário vinculado de ' +
          (invalidPerson.name.trim() || 'cada profissional') +
          '.',
      );
      return;
    }
    if (!person && section !== 'hours') {
      move(sections[step + 1].id);
      return;
    }

    const payload = {
      services: draftServices,
      professionals: people.map(({ key, ...item }) => ({
        ...item,
        name: item.name.trim(),
        phone: item.phone.trim(),
        email: item.email.trim(),
        service_overrides: Object.fromEntries(
          Object.entries(item.service_overrides || {}).filter(([ref]) =>
            item.services.includes(ref),
          ),
        ),
      })),
    };
    const body = JSON.stringify(payload);
    if (operation.current?.body !== body) operation.current = { body, id: crypto.randomUUID() };
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await api('catalog/setup/', {
        method: 'POST',
        body: JSON.stringify({ ...payload, request_id: operation.current.id }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal
      title={person ? person.name : 'Cadastrar equipe'}
      description={
        person
          ? 'Escolha o que deseja ajustar.'
          : 'Configure a equipe em três etapas e salve tudo de uma vez.'
      }
      onClose={() => !saving.current && onClose()}
    >
      <form onSubmit={submit} className="modal-form catalog-setup-form">
        <div
          className="catalog-steps"
          aria-label={person ? 'Seções do cadastro' : 'Etapas do cadastro'}
        >
          {sections.map(({ id, title, icon: Icon }, index) => (
            <button
              key={id}
              type="button"
              disabled={busy || !!newService || (!person && index > step)}
              aria-current={section === id ? 'step' : undefined}
              className={section === id ? 'current' : ''}
              onClick={() => move(id)}
            >
              <span>
                {person ? <Icon size={16} /> : index < step ? <Check size={14} /> : index + 1}
              </span>
              {title}
            </button>
          ))}
        </div>

        <div className="catalog-step-content" key={section} ref={nextFocus} tabIndex={-1}>
          <fieldset disabled={busy}>
            {section === 'people' && (
              <div className="catalog-editor-people">
                {!person && (
                  <p className="catalog-step-hint">
                    Comece pelos nomes. Os dados de contato podem ser preenchidos depois.
                  </p>
                )}
                {people.map((item, index) => (
                  <div className="catalog-editor-person" key={item.key}>
                    <div className="catalog-editor-name">
                      <label>
                        {person ? 'Nome do profissional' : 'Profissional ' + (index + 1)}
                        <input
                          required
                          maxLength={255}
                          placeholder="Ex.: Ana Costa"
                          value={item.name}
                          onChange={(event) => update(item.key, { name: event.target.value })}
                        />
                      </label>
                      {people.length > 1 && (
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={'Remover profissional ' + (index + 1)}
                          onClick={() =>
                            setPeople((items) => items.filter((entry) => entry.key !== item.key))
                          }
                        >
                          <X size={17} />
                        </button>
                      )}
                    </div>
                    <details className="catalog-editor-details" open={person ? true : undefined}>
                      <summary>
                        Contato e notificações <ChevronDown size={15} />
                      </summary>
                      <div className="form-grid">
                        <label>
                          Telefone{' '}
                          <input
                            type="tel"
                            value={item.phone}
                            maxLength={30}
                            placeholder="DDD + número"
                            onChange={(event) => update(item.key, { phone: event.target.value })}
                          />
                        </label>
                        <label>
                          E-mail{' '}
                          <input
                            inputMode="email"
                            autoComplete="email"
                            value={item.email}
                            maxLength={254}
                            placeholder="contato@exemplo.com"
                            onChange={(event) => update(item.key, { email: event.target.value })}
                          />
                        </label>
                        <label className="wide">
                          Quem recebe e-mails da agenda
                          <select
                            value={item.user ?? ''}
                            onChange={(event) =>
                              update(item.key, { user: Number(event.target.value) || null })
                            }
                          >
                            <option value="">Nenhum usuário vinculado</option>
                            {item.user && !data.users.some((user) => user.id === item.user) && (
                              <option value={item.user}>Usuário inativo</option>
                            )}
                            {data.users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name || user.email} · {user.email}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </details>
                  </div>
                ))}
                {!person && people.length < 30 && (
                  <button
                    type="button"
                    className="button secondary small catalog-add-person"
                    onClick={() => setPeople([...people, blankPerson()])}
                  >
                    <Plus size={16} /> Adicionar profissional
                  </button>
                )}
              </div>
            )}

            {section === 'services' &&
              (newService ? (
                <div className="catalog-create-service">
                  <h3>Novo serviço</h3>
                  <p className="catalog-step-hint">
                    Será associado a {current.name.trim()} e salvo com a equipe.
                  </p>
                  <ServiceFields value={newService} onChange={setNewService} />
                  <div className="catalog-inline-actions">
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => {
                        setNewService(null);
                        setError('');
                      }}
                    >
                      Cancelar
                    </button>
                    <button className="button primary small">
                      <Check size={15} /> Adicionar serviço
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="catalog-editor-toolbar">
                    {people.length > 1 ? (
                      <label className="catalog-assignee">
                        Profissional
                        <select
                          value={current.key}
                          onChange={(event) => setSelectedKey(event.target.value)}
                        >
                          {people.map((item) => (
                            <option key={item.key} value={item.key}>
                              {item.name} · {item.services.length} serviços
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <p className="catalog-step-hint">
                        Selecione os serviços que {current.name.trim()} oferece.
                      </p>
                    )}
                    {draftServices.length < 50 && (
                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() => setNewService(blankService())}
                      >
                        <Plus size={16} /> Novo serviço
                      </button>
                    )}
                  </div>
                  <ServiceSelector
                    key={current.key}
                    options={serviceOptions}
                    selected={current.services}
                    onChange={(services) => update(current.key, { services })}
                  />
                  {people.length > 1 && current.services.length > 0 && (
                    <button
                      type="button"
                      className="text-link catalog-copy-services"
                      onClick={() =>
                        setPeople((items) =>
                          items.map((item) => ({
                            ...item,
                            services: [...new Set([...item.services, ...current.services])],
                          })),
                        )
                      }
                    >
                      <Copy size={15} /> Adicionar esta seleção a todos
                    </button>
                  )}
                  {current.services.length > 0 && (
                    <details className="catalog-editor-details" key={current.key}>
                      <summary>
                        Preços e durações específicos <ChevronDown size={15} />
                      </summary>
                      <p className="catalog-step-hint">
                        Deixe em branco para usar o valor padrão do serviço.
                      </p>
                      <div className="catalog-overrides">
                        {serviceOptions
                          .filter((option) => current.services.includes(option.ref))
                          .map((option) => {
                            const value = current.service_overrides?.[option.ref] ?? {
                              duration: null,
                              sell_price: null,
                            };
                            function change(fields: Partial<typeof value>) {
                              update(current.key, {
                                service_overrides: {
                                  ...current.service_overrides,
                                  [option.ref]: { ...value, ...fields },
                                },
                              });
                            }
                            return (
                              <div key={option.ref}>
                                <strong>{option.name}</strong>
                                <div className="form-grid">
                                  <label>
                                    Duração (min)
                                    <input
                                      type="number"
                                      min={1}
                                      max={1440}
                                      step={1}
                                      placeholder={String(option.duration)}
                                      value={value.duration ?? ''}
                                      onChange={(event) =>
                                        change({
                                          duration: event.target.value
                                            ? Number(event.target.value)
                                            : null,
                                        })
                                      }
                                    />
                                  </label>
                                  <label>
                                    Preço (R$)
                                    <input
                                      type="number"
                                      min={0}
                                      max={99999999.99}
                                      step="0.01"
                                      placeholder={option.sell_price}
                                      value={value.sell_price ?? ''}
                                      onChange={(event) =>
                                        change({ sell_price: event.target.value || null })
                                      }
                                    />
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </details>
                  )}
                </>
              ))}

            {section === 'hours' && (
              <>
                {people.length > 1 && (
                  <div className="catalog-editor-toolbar">
                    {sharedHours ? (
                      <p className="catalog-step-hint">
                        O expediente abaixo vale para toda a equipe.
                      </p>
                    ) : (
                      <label className="catalog-assignee">
                        Profissional
                        <select
                          value={current.key}
                          onChange={(event) => setSelectedKey(event.target.value)}
                        >
                          {people.map((item) => (
                            <option key={item.key} value={item.key}>
                              {item.name} · {hoursSummary(item.availability || [])}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => {
                        if (sharedHours) setSeparateHours(true);
                        else {
                          setPeople((items) =>
                            items.map((item) => ({ ...item, availability: hours })),
                          );
                          setSeparateHours(false);
                        }
                      }}
                    >
                      {sharedHours ? 'Ajustar por pessoa' : 'Aplicar este horário a todos'}
                    </button>
                  </div>
                )}
                <WorkHoursEditor value={hours} onChange={changeHours} />
                {missingSchedule.length > 0 && (
                  <p className="catalog-step-hint">
                    Você pode salvar agora e definir o expediente depois. Quem estiver sem
                    expediente ainda não terá horários na agenda.
                  </p>
                )}
              </>
            )}
          </fieldset>
        </div>

        {error && <Notice error message={error} />}
        {!newService && (
          <div className="modal-footer catalog-editor-footer">
            <small>
              {people.length} {people.length === 1 ? 'profissional' : 'profissionais'} ·{' '}
              {totalLinks} {totalLinks === 1 ? 'vínculo' : 'vínculos'}
              {draftServices.length
                ? ' · ' +
                  draftServices.length +
                  (draftServices.length === 1 ? ' novo serviço' : ' novos serviços')
                : ''}
            </small>
            <div>
              {!person && step > 0 && (
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => move(sections[step - 1].id)}
                >
                  <ArrowLeft size={16} /> Voltar
                </button>
              )}
              <button className="button primary" disabled={busy}>
                {busy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : !person && section !== 'hours' ? (
                  <ArrowRight size={17} />
                ) : (
                  <Check size={17} />
                )}
                {busy
                  ? 'Salvando…'
                  : !person && section !== 'hours'
                    ? 'Continuar'
                    : person
                      ? 'Salvar alterações'
                      : 'Salvar equipe'}
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}

export function ServiceFields({
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
          rows={2}
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
  options: ServiceOption[];
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
          disabled={!filtered.length}
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
              : 'Use Novo serviço para criar e associar o primeiro.'}
          </p>
        )}
      </div>
    </div>
  );
}
