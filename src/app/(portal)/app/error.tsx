'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="error-state">
      <h2>Essa conexão precisa de mais um instante.</h2>
      <p>Não conseguimos carregar seu espaço agora.</p>
      <button className="button primary" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
