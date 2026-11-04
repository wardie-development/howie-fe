'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Clock3, Copy, Check, LoaderCircle, CalendarX2 } from 'lucide-react';
import WorkHoursEditor, { WorkSlot, hoursSummary } from './work-hours-editor';
import { api } from '@/lib/api';
import { PageHeader, Notice, Loading, ErrorState, Modal, useLoad } from './ui';
type PersonHours = { id: number; name: string; availability: WorkSlot[] };
export default function WorkHours() {
  const state = useLoad(() => api<{ professionals: PersonHours[] }>('catalog/hours/'));
  const query = useSearchParams(),
    target = query.get('professional');
  const [selected, setSelected] = useState<number[]>([]),
    [hours, setHours] = useState<WorkSlot[]>([]),
    [source, setSource] = useState('');
  const [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const initialized = useRef(''),
    operation = useRef<{ body: string; id: string } | null>(null);
  useEffect(() => {
    if (!state.data) return;
    const key = target || 'default';
    if (initialized.current === key) return;
    const person =
      state.data.professionals.find((p) => String(p.id) === target) || state.data.professionals[0];
    if (person) {
      setSelected([person.id]);
      setHours(person.availability);
      setSource(person.name);
    }
    initialized.current = key;
  }, [state.data, target]);
  function edit(person: PersonHours) {
    setSelected([person.id]);
    setHours(person.availability);
    setSource(person.name);
    setError('');
    setNotice('');
  }
  function toggle(person: PersonHours, checked: boolean) {
    if (checked) {
      if (!selected.length) {
        setHours(person.availability);
        setSource(person.name);
      }
      setSelected([...selected, person.id]);
    } else setSelected(selected.filter((id) => id !== person.id));
  }
  async function save() {
    if (busy || !selected.length) return;
    setBusy(true);
    setError('');
    try {
      const payload = { professionals: selected, availability: hours },
        body = JSON.stringify(payload);
      if (operation.current?.body !== body) operation.current = { body, id: crypto.randomUUID() };
      await api('catalog/hours/', {
        method: 'POST',
        body: JSON.stringify({ ...payload, request_id: operation.current!.id }),
      });
      setNotice(
        `Expediente salvo para ${selected.length} ${selected.length === 1 ? 'profissional' : 'profissionais'}.`,
      );
      setConfirm(false);
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (selected.length > 1 || !hours.length) setConfirm(true);
    else void save();
  }
  return (
    <>
      <PageHeader
        eyebrow="UMA SEMANA BEM ORGANIZADA"
        title="Seu expediente, sem complicar."
        description="Escolha os dias, ajuste os turnos e aplique a mesma rotina a toda a equipe."
      >
        <Link href="/app/bloqueios" className="button secondary">
          <CalendarX2 size={17} />
          Bloqueios e exceções
        </Link>
      </PageHeader>
      {notice && <Notice message={notice} />}
      {state.loading && !state.data ? (
        <Loading />
      ) : state.error ? (
        <ErrorState message={state.error} retry={state.reload} />
      ) : !state.data?.professionals.length ? (
        <section className="panel catalog-empty">
          <Clock3 size={30} />
          <h2>Primeiro, apresente sua equipe.</h2>
          <p>Cadastre um profissional e já configure o expediente no mesmo fluxo.</p>
          <Link className="button primary" href="/app/profissionais">
            Cadastrar profissionais
          </Link>
        </section>
      ) : (
        <div className="work-hours-layout">
          <aside className="panel work-hours-team">
            <div className="panel-head">
              <div>
                <h2>Aplicar para quem?</h2>
                <p>
                  {selected.length} {selected.length === 1 ? 'selecionado' : 'selecionados'}
                </p>
              </div>
            </div>
            <button
              className="text-link work-hours-select-all"
              disabled={busy}
              onClick={() => {
                if (selected.length === state.data!.professionals.length) setSelected([]);
                else {
                  if (!selected.length) {
                    setHours(state.data!.professionals[0].availability);
                    setSource(state.data!.professionals[0].name);
                  }
                  setSelected(state.data!.professionals.slice(0, 100).map((p) => p.id));
                }
              }}
            >
              {selected.length === state.data!.professionals.length ? 'Desmarcar' : 'Selecionar'}{' '}
              toda a equipe
            </button>
            {state.data!.professionals.map((person) => (
              <div
                key={person.id}
                className={`work-hours-person ${selected.includes(person.id) ? 'selected' : ''}`}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={selected.includes(person.id)}
                    disabled={busy}
                    onChange={(e) => toggle(person, e.target.checked)}
                  />
                  <span>
                    <strong>{person.name}</strong>
                    <small>{hoursSummary(person.availability)}</small>
                  </span>
                </label>
                <div>
                  <button className="text-link" disabled={busy} onClick={() => edit(person)}>
                    Editar
                  </button>
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-label={`Usar expediente de ${person.name} como modelo`}
                    title="Usar como modelo para a seleção"
                    onClick={() => {
                      setHours(person.availability);
                      setSource(person.name);
                    }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            ))}
          </aside>
          <section className="panel work-hours-main">
            <div className="panel-head">
              <div>
                <h2>Uma rotina que funciona.</h2>
                <p>
                  {source ? `Modelo carregado de ${source}.` : 'Defina o expediente abaixo.'}{' '}
                  {selected.length > 1
                    ? 'As alterações serão aplicadas a todos os selecionados.'
                    : ''}
                </p>
              </div>
              <Clock3 size={23} />
            </div>
            <form className="work-hours-form" onSubmit={submit}>
              <fieldset disabled={busy}>
                <WorkHoursEditor value={hours} onChange={setHours} />
              </fieldset>
              {error && <Notice error message={error} />}
              <div className="work-hours-save">
                <span>
                  {selected.length
                    ? `Salvar para ${selected.length} ${selected.length === 1 ? 'profissional' : 'profissionais'}`
                    : 'Selecione pelo menos um profissional'}
                </span>
                <button className="button primary" disabled={busy || !selected.length}>
                  {busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}
                  {busy ? 'Salvando...' : 'Salvar expediente'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {confirm && (
        <Modal
          title={!hours.length ? 'Deixar sem expediente?' : 'Aplicar expediente à seleção?'}
          description={
            !hours.length
              ? 'Os profissionais selecionados deixarão de oferecer novos horários. Os agendamentos já criados permanecem preservados.'
              : `Este expediente substituirá a rotina semanal de ${selected.length} profissionais. Os agendamentos existentes e os bloqueios especiais serão preservados.`
          }
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
        >
          <p className="work-hours-confirm-summary">{hoursSummary(hours)}</p>
          {error && <Notice error message={error} />}
          <div className="modal-footer">
            <button className="button secondary" disabled={busy} onClick={() => setConfirm(false)}>
              Revisar
            </button>
            <button className="button primary" disabled={busy} onClick={save}>
              {busy ? 'Salvando...' : 'Aplicar expediente'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
