'use client';
import { Clock3, Plus, X, Coffee, Copy, Sparkles } from 'lucide-react';
export type WorkSlot = { weekday: string; start_time: string; end_time: string };
export const workDays = [
  ['monday', 'Segunda', 'Seg'],
  ['tuesday', 'Terça', 'Ter'],
  ['wednesday', 'Quarta', 'Qua'],
  ['thursday', 'Quinta', 'Qui'],
  ['friday', 'Sexta', 'Sex'],
  ['saturday', 'Sábado', 'Sáb'],
  ['sunday', 'Domingo', 'Dom'],
];
const minutes = (value: string) => {
  if (!/^\d{2}:\d{2}/.test(value)) return 0;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
};
const clock = (value: number) =>
  `${Math.floor(value / 60)
    .toString()
    .padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
export function hoursSummary(slots: WorkSlot[]) {
  const days = new Set(slots.map((s) => s.weekday)).size;
  const total = slots.reduce(
    (sum, s) => sum + Math.max(0, minutes(s.end_time) - minutes(s.start_time)),
    0,
  );
  return !days
    ? 'Sem expediente'
    : `${days} ${days === 1 ? 'dia' : 'dias'} · ${Math.floor(total / 60)}h${total % 60 ? ` ${total % 60}min` : ''}/semana`;
}
export default function WorkHoursEditor({
  value,
  onChange,
}: {
  value: WorkSlot[];
  onChange: (value: WorkSlot[]) => void;
}) {
  function daySlots(day: string) {
    return value.filter((s) => s.weekday === day);
  }
  function setDay(day: string, slots: WorkSlot[]) {
    onChange([...value.filter((s) => s.weekday !== day), ...slots]);
  }
  function preset(days: number) {
    onChange(
      workDays
        .slice(0, days)
        .map(([weekday]) => ({ weekday, start_time: '09:00', end_time: '18:00' })),
    );
  }
  function lunch() {
    onChange(
      value.flatMap((slot) => {
        const start = slot.start_time.slice(0, 5),
          end = slot.end_time.slice(0, 5);
        if (end <= '12:00' || start >= '13:00') return [slot];
        return [
          ...(start < '12:00' ? [{ ...slot, end_time: '12:00' }] : []),
          ...(end > '13:00' ? [{ ...slot, start_time: '13:00' }] : []),
        ];
      }),
    );
  }
  function add(day: string) {
    const slots = daySlots(day);
    const last = slots.at(-1);
    let start = last ? minutes(last.end_time) : 9 * 60;
    if (start < 17 * 60) start += 60;
    const end = Math.min(23 * 60 + 59, Math.max(18 * 60, start + 60));
    if (start >= end) return;
    setDay(day, [...slots, { weekday: day, start_time: clock(start), end_time: clock(end) }]);
  }
  function copy() {
    const firstDay = workDays.find(([day]) => daySlots(day).length);
    if (!firstDay) return;
    const source = daySlots(firstDay[0]);
    onChange(
      workDays
        .filter(([day]) => daySlots(day).length)
        .flatMap(([weekday]) => source.map((slot) => ({ ...slot, weekday }))),
    );
  }
  return (
    <div className="work-hours-editor">
      <div className="work-hours-presets">
        <span>
          <Sparkles size={14} />
          Comece com um modelo
        </span>
        <div>
          <button type="button" onClick={() => preset(5)}>
            Seg–Sex · 09h–18h
          </button>
          <button type="button" onClick={() => preset(6)}>
            Seg–Sáb · 09h–18h
          </button>
          <button type="button" onClick={() => onChange([])}>
            Limpar
          </button>
        </div>
      </div>
      <div className="work-hours-tools">
        <button type="button" className="text-link" onClick={lunch} disabled={!value.length}>
          <Coffee size={14} />
          Pausa 12h–13h
        </button>
        <button type="button" className="text-link" disabled={!value.length} onClick={copy}>
          <Copy size={14} />
          Repetir horários nos dias abertos
        </button>
      </div>
      <div className="work-hours-week">
        {workDays.map(([weekday, label]) => {
          const slots = daySlots(weekday);
          return (
            <div className={`work-hours-day ${slots.length ? 'enabled' : ''}`} key={weekday}>
              <label className="work-hours-toggle">
                <input
                  type="checkbox"
                  checked={!!slots.length}
                  onChange={(e) =>
                    setDay(
                      weekday,
                      e.target.checked ? [{ weekday, start_time: '09:00', end_time: '18:00' }] : [],
                    )
                  }
                />
                <strong>{label}</strong>
              </label>
              <div className="work-hours-intervals">
                {slots.length ? (
                  slots.map((slot, index) => (
                    <div className="work-hours-interval" key={index}>
                      <input
                        aria-label={`${label}: início ${index + 1}`}
                        type="time"
                        value={slot.start_time.slice(0, 5)}
                        required
                        onChange={(e) =>
                          setDay(
                            weekday,
                            slots.map((s, i) =>
                              i === index ? { ...s, start_time: e.target.value } : s,
                            ),
                          )
                        }
                      />
                      <span>até</span>
                      <input
                        aria-label={`${label}: fim ${index + 1}`}
                        type="time"
                        value={slot.end_time.slice(0, 5)}
                        required
                        onChange={(e) =>
                          setDay(
                            weekday,
                            slots.map((s, i) =>
                              i === index ? { ...s, end_time: e.target.value } : s,
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remover intervalo ${index + 1} de ${label}`}
                        onClick={() =>
                          setDay(
                            weekday,
                            slots.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="work-hours-closed">Fechado</span>
                )}
              </div>
              {slots.length > 0 && slots.length < 4 && (
                <button
                  className="icon-button work-hours-add"
                  type="button"
                  aria-label={`Adicionar intervalo em ${label}`}
                  onClick={() => add(weekday)}
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="work-hours-summary">
        <Clock3 size={16} />
        <strong>{hoursSummary(value)}</strong>
        <span>Horários de Fortaleza · UTC−3</span>
      </div>
      <p className="work-hours-tip">
        Use mais de um intervalo para pausas ou turnos. Os agendamentos existentes permanecem como
        estão; novos horários seguem este expediente.
      </p>
    </div>
  );
}
