'use client';
import { FormEvent, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { hoursSummary } from './work-hours-editor';
import CatalogEditor, {
  CatalogData,
  DraftService,
  Person,
  ServiceFields,
  blankService,
} from './catalog-editor';
import { Plus, Users, Scissors, Pencil, Trash2, Mail, Phone, Link2, Clock3 } from 'lucide-react';
import { api, money } from '@/lib/api';
import { PageHeader, Modal, Notice, Loading, ErrorState, SearchField, useLoad } from './ui';

export default function Catalog() {
  const state = useLoad(() => api<CatalogData>('catalog/'));
  const [tab, setTab] = useState<'people' | 'services'>('people');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{ person?: Person; section: 'people' | 'services' } | null>(
    null,
  );
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
  function openPeople(person?: Person, section: 'people' | 'services' = 'people') {
    setEditor({ person, section });
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
  const professionalsByService = useMemo(() => {
    const counts = new Map<number, number>();
    for (const person of state.data?.professionals || [])
      for (const item of person.services)
        counts.set(item.service, (counts.get(item.service) || 0) + 1);
    return counts;
  }, [state.data]);
  const matches = (value: string) =>
    value.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'));
  return (
    <>
      <PageHeader
        eyebrow="CATÁLOGO DO SEU NEGÓCIO"
        title="Profissionais e serviços"
        description="Organize quem atende, quais serviços oferece e em quais horários."
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
        <button className="button primary" disabled={!state.data} onClick={() => openPeople()}>
          <Plus size={18} />
          Cadastrar equipe
        </button>
      </PageHeader>
      {notice && <Notice message={notice} />}
      <div className="catalog-toolbar">
        <div className="catalog-tabs" role="group" aria-label="Visualização do cadastro">
          <button
            className={tab === 'people' ? 'active' : ''}
            aria-pressed={tab === 'people'}
            onClick={() => {
              setTab('people');
              setSearch('');
            }}
          >
            <Users size={17} />
            Profissionais <span>{state.data?.professionals.length || 0}</span>
          </button>
          <button
            className={tab === 'services' ? 'active' : ''}
            aria-pressed={tab === 'services'}
            onClick={() => {
              setTab('services');
              setSearch('');
            }}
          >
            <Scissors size={17} />
            Serviços <span>{state.data?.services.length || 0}</span>
          </button>
        </div>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={tab === 'people' ? 'Buscar profissional ou serviço…' : 'Buscar serviço…'}
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
                        {person.user && (
                          <span>
                            <Link2 size={14} /> Avisos por e-mail:{' '}
                            {person.user_name || 'usuário vinculado'}
                          </span>
                        )}
                      </div>
                      {person.services.length > 0 && (
                        <div className="catalog-chips">
                          {person.services.slice(0, 3).map((service) => (
                            <span key={service.id}>{service.name}</span>
                          ))}
                          {person.services.length > 3 && <span>+{person.services.length - 3}</span>}
                        </div>
                      )}
                      <Link
                        className="catalog-hours-link"
                        href={`/app/expedientes?professional=${person.id}`}
                      >
                        <Clock3 size={14} />
                        {hoursSummary(person.availability)}
                        <span>Ajustar</span>
                      </Link>
                      <div className="catalog-person-footer">
                        <button
                          className="text-link"
                          onClick={() => openPeople(person, 'services')}
                        >
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
                          {service.duration} min · {money(service.sell_price)} ·{' '}
                          {professionalsByService.get(service.id) || 0}{' '}
                          {(professionalsByService.get(service.id) || 0) === 1
                            ? 'profissional'
                            : 'profissionais'}
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
                {tab === 'people' ? <Users size={32} /> : <Scissors size={32} />}
                <h2>
                  {search
                    ? 'Nenhum resultado'
                    : tab === 'people'
                      ? 'Sua equipe começa aqui'
                      : 'Seu catálogo começa aqui'}
                </h2>
                <p>
                  {search
                    ? 'Tente outro nome.'
                    : tab === 'people'
                      ? 'Adicione a equipe, os serviços e os horários em três etapas.'
                      : 'Cadastre um serviço para associá-lo a quem atende.'}
                </p>
                {search && (
                  <button className="button secondary" onClick={() => setSearch('')}>
                    Limpar busca
                  </button>
                )}
              </div>
            )}
          </>
        )
      )}
      {editor && state.data && (
        <CatalogEditor
          data={state.data}
          person={editor.person}
          initialSection={editor.section}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setNotice(editor.person ? 'Profissional atualizado.' : 'Cadastro da equipe concluído.');
            setTab('people');
            setSearch('');
            state.reload();
          }}
        />
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
