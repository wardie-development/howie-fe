'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowUp, FlaskConical, RotateCcw, Sparkles } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Modal } from './ui';

type Turn = { role: 'user' | 'assistant'; text: string };
type TestState = {
  used_percent: number;
  status?: 'queued' | 'working' | 'done' | 'failed';
  reply?: string;
};

export default function AgentTestChat({
  agent,
  close,
}: {
  agent: { id: number; name: string };
  close: () => void;
}) {
  const endpoint = `agents/${agent.id}/test/`;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState('');
  const [used, setUsed] = useState<number | null>(null);
  const [error, setError] = useState('');
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const lock = useRef(false);
  const active = useRef<AbortController | null>(null);

  async function refresh(signal?: AbortSignal) {
    try {
      setUsed((await api<TestState>(endpoint, { signal })).used_percent);
    } catch {
      if (!signal?.aborted) setError('Não foi possível consultar o limite. Tente atualizar.');
    }
  }

  useEffect(() => {
    const initial = new AbortController();
    void refresh(initial.signal);
    return () => {
      initial.abort();
      active.current?.abort();
    };
  }, [endpoint]);

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [turns, pending]);

  async function send(text: string) {
    text = text.trim();
    if (!text || lock.current || used === null || used >= 100) return;
    lock.current = true;
    setPending(text);
    setMessage('');
    setError('');
    const requestId = crypto.randomUUID();
    const controller = new AbortController();
    active.current = controller;
    const { signal } = controller;
    const url = `${endpoint}?request_id=${requestId}`;
    try {
      let result: TestState;
      try {
        result = await api<TestState>(endpoint, {
          method: 'POST',
          signal,
          body: JSON.stringify({ request_id: requestId, message: text, history: turns.slice(-10) }),
        });
      } catch (err) {
        if (signal.aborted || (err instanceof ApiError && err.status < 500)) throw err;
        result = await api<TestState>(url, { signal });
      }
      setUsed(result.used_percent);
      const deadline = Date.now() + 185_000;
      while (result.status === 'queued' || result.status === 'working') {
        await new Promise((resolve) => window.setTimeout(resolve, 2200));
        if (signal.aborted) return;
        if (Date.now() >= deadline) throw new Error('A resposta demorou além do esperado.');
        try {
          result = await api<TestState>(url, { signal });
          setUsed(result.used_percent);
        } catch (err) {
          if (signal.aborted || (err instanceof ApiError && err.status < 500)) throw err;
        }
      }
      if (result.status !== 'done' || !result.reply)
        throw new Error('O agente não conseguiu responder. Tente novamente.');
      const reply = result.reply;
      setTurns((current) => [
        ...current,
        { role: 'user', text },
        { role: 'assistant', text: reply },
      ]);
    } catch (err) {
      if (signal.aborted) return;
      setError(err instanceof Error ? err.message : 'O teste não pôde ser concluído.');
      setMessage(text);
      await refresh(signal);
    } finally {
      lock.current = false;
      if (!signal.aborted) {
        setPending('');
        requestAnimationFrame(() => input.current?.focus());
      }
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(message);
  }

  const disabled = !!pending || used === null || used >= 100;
  return (
    <Modal
      title={agent.name}
      description="Chat de teste · O atendimento real acontece no WhatsApp."
      onClose={close}
    >
      <div className="agent-test-chat">
        <div className="agent-test-toolbar">
          <span>
            <FlaskConical size={15} /> Modo teste
          </span>
          <div className="agent-test-quota">
            <span>
              Uso diário <strong>{used === null ? '—' : `${used}%`}</strong>
            </span>
            {used !== null && (
              <progress aria-label="Uso diário do chat de teste" max={100} value={used} />
            )}
          </div>
          <button
            className="icon-button"
            type="button"
            disabled={!!pending || !turns.length}
            aria-label="Reiniciar chat de teste"
            onClick={() => {
              setTurns([]);
              setMessage('');
              setError('');
              input.current?.focus();
            }}
          >
            <RotateCcw size={17} />
          </button>
        </div>
        <div
          className="agent-test-log"
          ref={log}
          role="log"
          aria-label="Mensagens do teste"
          aria-live="polite"
        >
          {!turns.length && !pending && (
            <div className="agent-test-welcome">
              <span>
                <Sparkles size={25} />
              </span>
              <h3>Experimente como cliente</h3>
              <p>
                O agente pode consultar seu catálogo e horários. Os agendamentos aqui são apenas
                simulados.
              </p>
              <button
                type="button"
                className="button secondary small"
                disabled={disabled}
                onClick={() => void send('Olá! Quais serviços vocês oferecem?')}
              >
                Quais serviços vocês oferecem?
              </button>
            </div>
          )}
          {turns.map((turn, index) => (
            <div key={index} className={'agent-test-message ' + turn.role}>
              {turn.text}
            </div>
          ))}
          {pending && (
            <>
              <div className="agent-test-message user">{pending}</div>
              <div className="agent-test-typing" role="status">
                <span aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>{' '}
                Preparando resposta…
              </div>
            </>
          )}
        </div>
        {error && (
          <div role="alert" className="agent-test-error">
            {error}
            {used === null && (
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setError('');
                  void refresh();
                }}
              >
                Atualizar
              </button>
            )}
          </div>
        )}
        {used === 100 && !pending && (
          <p className="agent-test-limit">
            Limite diário atingido. Renova à meia-noite, no horário de Fortaleza.
          </p>
        )}
        <form className="agent-test-compose" onSubmit={submit}>
          <textarea
            ref={input}
            aria-label="Mensagem de teste"
            placeholder="Digite uma mensagem de teste…"
            rows={2}
            maxLength={1000}
            disabled={disabled}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void send(message);
              }
            }}
          />
          <button
            type="submit"
            className="button primary small"
            aria-label="Enviar mensagem"
            disabled={disabled || !message.trim()}
          >
            <ArrowUp size={19} />
          </button>
        </form>
      </div>
    </Modal>
  );
}
