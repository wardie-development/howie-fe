'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Sparkles, Undo2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Notice, useLoad } from './ui';

const endpoint = 'agents/prompt-suggestion/';
type Quota = { ready: boolean; limit: number; remaining: number; reset_at: string };

export default function AgentInstructions({ initial }: { initial: string }) {
  const status = useLoad(() => api<Quota>(endpoint));
  const [instructions, setInstructions] = useState(initial);
  const [suggestion, setSuggestion] = useState('');
  const [previous, setPrevious] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [updatedQuota, setUpdatedQuota] = useState<Quota | null>(null);
  const inFlight = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const quota = updatedQuota ?? status.data;
  const exhausted = quota?.remaining === 0;
  const refresh = useRef(status.reload);
  refresh.current = status.reload;
  const resetAt = quota?.reset_at;

  useEffect(() => {
    if (!resetAt) return;
    const delay = Math.max(0, new Date(resetAt).getTime() - Date.now()) + 300;
    const timer = window.setTimeout(() => {
      setUpdatedQuota(null);
      refresh.current();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [resetAt]);

  async function generate() {
    if (inFlight.current || !quota?.ready || exhausted) return;
    inFlight.current = true;
    setWorking(true);
    setError('');
    try {
      const result = await api<Quota & { suggestion: string }>(endpoint, {
        method: 'POST',
        body: '{}',
      });
      setUpdatedQuota(result);
      setSuggestion(result.suggestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar as orientações.');
      setUpdatedQuota(null);
      status.reload();
    } finally {
      setWorking(false);
      inFlight.current = false;
    }
  }

  return (
    <div className="agent-instructions">
      <section className="prompt-studio" aria-label="Sugestão de orientações com IA">
        <div className="prompt-studio-top">
          <span className={'prompt-glyph' + (working ? ' is-working' : '')} aria-hidden="true">
            <Sparkles size={20} />
          </span>
          <div className="prompt-studio-intro">
            <strong>Orientações com IA</strong>
            <p>
              {working
                ? 'Preparando uma sugestão para seu WhatsApp…'
                : 'Use seu catálogo para criar um roteiro de atendimento e vendas.'}
            </p>
          </div>
          <button
            type="button"
            className="button secondary small prompt-generate"
            disabled={
              working ||
              status.loading ||
              !!status.error ||
              !quota?.ready ||
              exhausted ||
              !!suggestion
            }
            onClick={generate}
          >
            <Sparkles size={15} /> {working ? 'Gerando…' : 'Sugerir orientações'}
          </button>
        </div>
        {working && (
          <div className="prompt-progress" role="status" aria-label="Gerando orientações">
            <span aria-hidden="true" />
          </div>
        )}
        {status.error ? (
          <div className="prompt-studio-meta">
            <small>Não foi possível consultar o limite diário.</small>
            <button type="button" className="text-link" onClick={status.reload}>
              Atualizar
            </button>
          </div>
        ) : status.loading && !quota ? (
          <p className="prompt-studio-note" role="status">
            Consultando disponibilidade…
          </p>
        ) : (
          quota && (
            <>
              <div className="prompt-studio-meta" aria-live="polite">
                <span className="prompt-credits" aria-hidden="true">
                  {Array.from({ length: quota.limit }, (_, index) => (
                    <i key={index} className={index < quota.remaining ? 'available' : ''} />
                  ))}
                </span>
                <small>
                  <strong>
                    {quota.remaining} de {quota.limit}
                  </strong>{' '}
                  gerações disponíveis hoje
                </small>
                <small className="prompt-reset">Renova à meia-noite · Fortaleza</small>
              </div>
              {!quota.ready && (
                <div className="prompt-studio-note">
                  Cadastre um profissional com serviço associado e expediente.{' '}
                  <Link className="text-link" href="/app/profissionais">
                    Organizar catálogo <ArrowUpRight size={13} />
                  </Link>
                </div>
              )}
              {exhausted && (
                <p className="prompt-studio-note">
                  Seu limite de hoje acabou. Você ainda pode editar o texto manualmente.
                </p>
              )}
            </>
          )
        )}
        {error && <Notice error message={error} />}
        {suggestion && (
          <div className="prompt-preview">
            <div role="status" className="prompt-preview-heading">
              <strong>Sugestão pronta para revisar</strong>
              <small>Você poderá ajustar o texto antes de salvar o agente.</small>
            </div>
            <div className="prompt-preview-text" tabIndex={0} aria-label="Texto sugerido">
              {suggestion}
            </div>
            <div className="prompt-preview-actions">
              <button
                type="button"
                className="button secondary small"
                onClick={() => setSuggestion('')}
              >
                Descartar
              </button>
              <button
                type="button"
                className="button primary small"
                onClick={() => {
                  setPrevious(instructions);
                  setInstructions(suggestion);
                  setSuggestion('');
                  requestAnimationFrame(() => input.current?.focus());
                }}
              >
                <Check size={16} /> Usar sugestão
              </button>
            </div>
          </div>
        )}
      </section>
      <label>
        Orientações de atendimento
        <textarea
          ref={input}
          name="custom_prompt"
          rows={7}
          maxLength={20000}
          placeholder="Ex.: Atenda com simpatia, use mensagens curtas e confirme os detalhes antes de agendar."
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
        />
      </label>
      <div className="agent-instructions-foot">
        <small className="field-hint">Evite incluir senhas e credenciais.</small>
        {previous !== null && (
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setInstructions(previous);
              setPrevious(null);
              input.current?.focus();
            }}
          >
            <Undo2 size={15} /> Desfazer aplicação
          </button>
        )}
      </div>
    </div>
  );
}
