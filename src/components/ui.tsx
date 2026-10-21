'use client';
import { useEffect, useRef, useState, useCallback, useId } from 'react';
import { X, LoaderCircle, AlertCircle, ArrowUpRight, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { ApiError } from '@/lib/api';

export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    loader()
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            window.location.assign('/login');
            return;
          }
          setError(err instanceof Error ? err.message : 'Não foi possível carregar os dados.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [...deps, version]);
  return { data, error, loading, reload: () => setVersion((v) => v + 1) };
}
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-header-actions">{children}</div>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle size={23} className="spin" />
      <span>Organizando suas informações...</span>
    </div>
  );
}
export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={25} />
      <h3>Não foi possível carregar.</h3>
      <p>{message}</p>
      <button className="button secondary small" onClick={retry}>
        Tentar novamente
      </button>
    </div>
  );
}
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  href,
}: {
  icon: typeof Plus;
  title: string;
  description: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={29} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && href && (
        <Link className="button primary small" href={href}>
          {action}
          <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = 'Buscar...',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-field">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
const modalStack: HTMLElement[] = [];
let modalBodyOverflow = '';

export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    if (!modalStack.length) modalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const element = ref.current;
    if (element) modalStack.push(element);
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
        ) || [],
      );
    focusable()[0]?.focus();
    function key(event: KeyboardEvent) {
      if (modalStack[modalStack.length - 1] !== ref.current) return;
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener('keydown', key);
    return () => {
      const index = modalStack.indexOf(element!);
      if (index >= 0) modalStack.splice(index, 1);
      document.body.style.overflow = modalStack.length ? 'hidden' : modalBodyOverflow;
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div className="modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Notice({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <div role={error ? 'alert' : 'status'} className={error ? 'error-notice' : 'success-notice'}>
      {message}
    </div>
  );
}
