'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import luxonPlugin from '@fullcalendar/luxon3';
import ptBr from '@fullcalendar/core/locales/pt-br';
import {
  Plus,
  CalendarDays,
  Clock3,
  Users,
  UserRound,
  Scissors,
  Check,
  Ban,
  LoaderCircle,
  ArrowRight,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { api, list, money, dateTime } from '@/lib/api';
import type { Appointment, Professional, Offering, Client, Block } from '@/lib/types';
import { PageHeader, Modal, Notice, Loading, ErrorState, useLoad } from './ui';
const plugins = [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin, luxonPlugin];
const colors = ['#4374a4', '#8b70a4', '#439186', '#b68b39', '#a76876', '#60799c'];
const labels: Record<string, string> = {
  pending: 'Pendente',
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  canceled: 'Cancelado',
};
function inputDate(value: string) {
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
type Slot = { starts_at: string; ends_at: string; professional_service_id: number };
export default function Agenda() {
  const calendar = useRef<FullCalendar | null>(null);
  useEffect(() => {
    const media = window.matchMedia('(max-width:700px)');
    const resize = () =>
      calendar.current?.getApi().changeView(media.matches ? 'timeGridDay' : 'timeGridWeek');
    resize();
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, []);
  const [range, setRange] = useState({ start: '', end: '' }),
    [professional, setProfessional] = useState(''),
    [create, setCreate] = useState<string | null>(null),
    [selected, setSelected] = useState<Appointment | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [offering, setOffering] = useState(''),
    [start, setStart] = useState(''),
    [slots, setSlots] = useState<Slot[] | null>(null),
    [slotsBusy, setSlotsBusy] = useState(false);
  const reference = useLoad(async () => ({
    professionals: await list<Professional>('professionals/'),
    offerings: await list<Offering>('offerings/'),
    clients: await list<Client>('clients/'),
  }));
  const appointments = useLoad(
    () =>
      range.start
        ? list<Appointment>(
            `appointments/?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}${professional ? `&professional=${professional}` : ''}`,
          )
        : Promise.resolve([]),
    [range.start, range.end, professional],
  );
  const blocks = useLoad(() => list<Block>('blocks/'));
  function newAppointment(value: string) {
    setCreate(value);
    setStart(value);
    setOffering('');
    setSlots(null);
    setError('');
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api('appointments/', {
        method: 'POST',
        body: JSON.stringify({
          professional_service: Number(values.professional_service),
          client: Number(values.client),
          starts_at: `${start}:00-03:00`,
          notes: values.notes,
        }),
      });
      setCreate(null);
      setNotice('Agendamento realizado. Um novo encontro na sua agenda.');
      appointments.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível agendar.');
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(status: string) {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      await api(`appointments/${selected.id}/status/`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      setSelected(null);
      setNotice(
        status === 'canceled'
          ? 'Agendamento cancelado. O horário voltou a ficar disponível.'
          : 'Agendamento confirmado.',
      );
      appointments.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar.');
    } finally {
      setBusy(false);
    }
  }
  async function reschedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      await api(`appointments/${selected.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ starts_at: `${data.get('starts_at')}:00-03:00` }),
      });
      setSelected(null);
      setNotice('Agendamento remarcado.');
      appointments.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remarcar.');
    } finally {
      setBusy(false);
    }
  }
  async function available() {
    const item = reference.data?.offerings.find((o) => o.id === Number(offering));
    if (!item || !start) return;
    setSlotsBusy(true);
    setError('');
    try {
      const result = await api<Slot[]>(
        `appointments/slots/?date=${start.slice(0, 10)}&service_id=${item.service}&professional_id=${item.professional}`,
      );
      setSlots(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível consultar.');
    } finally {
      setSlotsBusy(false);
    }
  }
  const events = (appointments.data || [])
    .filter((a) => a.status !== 'canceled')
    .map((a) => ({
      id: String(a.id),
      title: a.service_name,
      start: a.starts_at,
      end: a.ends_at,
      backgroundColor: colors[a.professional_id % colors.length],
      borderColor: colors[a.professional_id % colors.length],
      extendedProps: { appointment: a },
    }));
  const blockEvents = (blocks.data || [])
    .filter((b) => !professional || b.professional === Number(professional))
    .map((b) => ({
      id: `block-${b.id}`,
      title: `Bloqueado · ${b.professional_name}${b.reason ? ` · ${b.reason}` : ''}`,
      start: b.starts_at,
      end: b.ends_at,
      display: 'background',
      backgroundColor: '#d8d8dd',
    }));
  return (
    <>
      <PageHeader
        eyebrow="TEMPO BEM CUIDADO"
        title="Sua agenda, com espaço para tudo."
        description="Cada horário tem uma história. Veja quem chega, com quem e para quê."
      >
        <button
          className="button primary small"
          onClick={() =>
            newAppointment(
              inputDate(new Date(Date.now() + 86400000).toISOString()).slice(0, 11) + '09:00',
            )
          }
        >
          <Plus size={17} />
          Novo agendamento
        </button>
      </PageHeader>
      {notice && <Notice message={notice} />}
      <div className="agenda-workspace">
        <aside className="agenda-side panel">
          <div className="agenda-today">
            <CalendarDays size={22} />
            <strong>
              Hoje ·{' '}
              {new Date().toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'long',
                timeZone: 'America/Fortaleza',
              })}
            </strong>
            <span>
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                timeZone: 'America/Fortaleza',
              })}
            </span>
          </div>
          <label className="agenda-filter-label">
            Mostrar agenda de
            <select value={professional} onChange={(e) => setProfessional(e.target.value)}>
              <option value="">Todos os profissionais</option>
              {reference.data?.professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <h3>Profissionais</h3>
          <div className="calendar-legends">
            {reference.data?.professionals.length ? (
              reference.data.professionals.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProfessional(professional === String(p.id) ? '' : String(p.id))}
                >
                  <i style={{ background: colors[p.id % colors.length] }} />
                  <span>{p.name}</span>
                  {professional === String(p.id) && <Check size={14} />}
                </button>
              ))
            ) : (
              <p className="muted">Sua equipe aparece aqui após o cadastro.</p>
            )}
          </div>
          <div className="agenda-tip">
            <Clock3 size={19} />
            <strong>O horário certo faz diferença.</strong>
            <p>A agenda respeita os expedientes, bloqueios e compromissos de cada profissional.</p>
            <Link href="/app/expedientes">
              Ajustar expedientes <ArrowRight size={15} />
            </Link>
          </div>
          <small className="timezone-note">Horários de Fortaleza · UTC−3</small>
        </aside>
        <section className="panel calendar-panel">
          {appointments.error && (
            <ErrorState message={appointments.error} retry={appointments.reload} />
          )}
          <div className="calendar-container" aria-label="Calendário de agendamentos">
            {appointments.loading && (
              <div className="calendar-loading" role="status">
                <LoaderCircle className="spin" size={17} /> Atualizando agenda
              </div>
            )}
            <FullCalendar
              ref={calendar}
              plugins={plugins}
              locale={ptBr}
              timeZone="America/Fortaleza"
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
              }}
              buttonText={{
                today: 'Hoje',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia',
                list: 'Lista',
              }}
              allDaySlot={false}
              nowIndicator
              weekends
              selectable
              selectMirror
              height="auto"
              slotMinTime="07:00:00"
              slotMaxTime="22:00:00"
              slotDuration="00:30:00"
              slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
              dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
              dayMaxEvents={3}
              eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
              events={[...events, ...blockEvents]}
              eventDidMount={(info) => {
                const appointment = info.event.extendedProps.appointment as Appointment | undefined;
                if (!appointment) return;
                const label = `${appointment.service_name}. Cliente: ${appointment.client_name}. Profissional: ${appointment.professional_name}. ${dateTime(appointment.starts_at)}.`;
                info.el.title = label;
                info.el.setAttribute('aria-label', label);
                info.el.setAttribute('role', 'button');
                info.el.tabIndex = 0;
                info.el.addEventListener('keydown', (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    info.el.click();
                  }
                });
              }}
              datesSet={(info) =>
                setRange((current) =>
                  current.start === info.startStr && current.end === info.endStr
                    ? current
                    : { start: info.startStr, end: info.endStr },
                )
              }
              dateClick={(info) =>
                newAppointment(info.allDay ? `${info.dateStr}T09:00` : inputDate(info.dateStr))
              }
              select={(info) => {
                newAppointment(
                  info.allDay ? `${info.startStr.slice(0, 10)}T09:00` : inputDate(info.startStr),
                );
                calendar.current?.getApi().unselect();
              }}
              eventClick={(info) => {
                const appt = info.event.extendedProps.appointment as Appointment | undefined;
                if (appt) {
                  setSelected(appt);
                  setError('');
                }
              }}
              eventContent={(info) => {
                const a = info.event.extendedProps.appointment as Appointment | undefined;
                return (
                  <div className="calendar-event-content">
                    <span>{info.timeText}</span>
                    <strong>{info.event.title}</strong>
                    {a && (
                      <small>
                        {a.client_name} · {a.professional_name}
                      </small>
                    )}
                  </div>
                );
              }}
            />
          </div>
          <div className="calendar-bottom">
            <span>
              <i className="legend-square" /> Selecione um horário para agendar.
            </span>
            <span>
              {(appointments.data || []).filter((a) => a.status !== 'canceled').length} agendamentos
              no período
            </span>
          </div>
        </section>
      </div>
      {reference.error && <Notice error message={reference.error} />}
      {blocks.error && <Notice error message={blocks.error} />}
      {create !== null && (
        <Modal
          title="Um novo encontro na agenda."
          description="Selecione o serviço, o cliente e o melhor horário. Horários de Fortaleza (UTC−3)."
          onClose={() => !busy && setCreate(null)}
        >
          <form className="modal-form" onSubmit={save}>
            {!reference.data?.offerings.length || !reference.data?.clients.length ? (
              <div className="info-strip">
                <p>
                  Para agendar, cadastre <Link href="/app/clientes">um cliente</Link> e os{' '}
                  <Link href="/app/vinculos">serviços por profissional</Link>.
                </p>
              </div>
            ) : null}
            <label>
              Serviço e profissional
              <select
                name="professional_service"
                required
                value={offering}
                onChange={(e) => {
                  setOffering(e.target.value);
                  setSlots(null);
                }}
              >
                <option value="">Selecione um atendimento...</option>
                {reference.data?.offerings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.service_name} · {o.professional_name} · {o.effective_duration} min ·{' '}
                    {money(o.effective_sell_price)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cliente
              <select name="client" required defaultValue="">
                <option value="">Selecione um cliente...</option>
                {reference.data?.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data e hora
              <input
                name="starts_at"
                type="datetime-local"
                required
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setSlots(null);
                }}
              />
            </label>
            <button
              type="button"
              className="button secondary small"
              disabled={!offering || !start || slotsBusy}
              onClick={available}
            >
              {slotsBusy ? <LoaderCircle className="spin" size={16} /> : <Clock3 size={16} />}
              Consultar horários disponíveis
            </button>
            {slots !== null && (
              <div className="available-slots">
                {slots.length ? (
                  slots.map((slot) => (
                    <button
                      type="button"
                      key={slot.starts_at}
                      className={inputDate(slot.starts_at) === start ? 'selected' : ''}
                      onClick={() => setStart(inputDate(slot.starts_at))}
                    >
                      {new Date(slot.starts_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'America/Fortaleza',
                      })}
                    </button>
                  ))
                ) : (
                  <p>
                    Nenhum horário disponível nesta data. Confira o expediente ou escolha outro dia.
                  </p>
                )}
              </div>
            )}
            <label>
              Observações <span className="optional">Opcional</span>
              <textarea
                name="notes"
                rows={3}
                maxLength={5000}
                placeholder="Algo importante para este atendimento?"
              />
            </label>
            {error && <Notice error message={error} />}
            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setCreate(null)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                disabled={
                  busy || !reference.data?.offerings.length || !reference.data?.clients.length
                }
              >
                {busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}Confirmar
                agendamento
              </button>
            </div>
          </form>
        </Modal>
      )}
      {selected && (
        <Modal
          title={selected.service_name}
          description={`${selected.client_name} · ${dateTime(selected.starts_at)}`}
          onClose={() => !busy && setSelected(null)}
        >
          <div className="appointment-details">
            <span
              className={`status-pill ${selected.status === 'confirmed' ? 'positive' : 'neutral'}`}
            >
              {labels[selected.status]}
            </span>
            <dl>
              <div>
                <dt>
                  <UserRound size={16} /> Cliente
                </dt>
                <dd>
                  {selected.client_name}
                  <small>{selected.client_phone}</small>
                </dd>
              </div>
              <div>
                <dt>
                  <Users size={16} /> Profissional
                </dt>
                <dd>{selected.professional_name}</dd>
              </div>
              <div>
                <dt>
                  <Clock3 size={16} /> Horário
                </dt>
                <dd>
                  {dateTime(selected.starts_at)}
                  <small>
                    Até{' '}
                    {new Date(selected.ends_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'America/Fortaleza',
                    })}{' '}
                    · Fortaleza
                  </small>
                </dd>
              </div>
              <div>
                <dt>Valor</dt>
                <dd>{money(selected.price)}</dd>
              </div>
            </dl>
            {selected.notes && <p className="appointment-notes">{selected.notes}</p>}
            {selected.status !== 'canceled' && (
              <form onSubmit={reschedule} className="reschedule-form">
                <label>
                  Remarcar para
                  <input
                    name="starts_at"
                    type="datetime-local"
                    required
                    defaultValue={inputDate(selected.starts_at)}
                  />
                </label>
                <button className="button secondary small" disabled={busy}>
                  Remarcar
                </button>
              </form>
            )}
            {error && <Notice error message={error} />}
            <div className="modal-footer">
              {selected.status !== 'canceled' && (
                <button
                  className="button danger-outline small"
                  onClick={() => changeStatus('canceled')}
                  disabled={busy}
                >
                  <Ban size={15} />
                  Cancelar agendamento
                </button>
              )}
              {selected.status !== 'confirmed' && selected.status !== 'canceled' && (
                <button
                  className="button primary small"
                  onClick={() => changeStatus('confirmed')}
                  disabled={busy}
                >
                  <Check size={15} />
                  Confirmar presença
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
