import Link from 'next/link';
import { Brand } from '@/components/brand';
export default function NotFound() {
  return (
    <main className="not-found">
      <Brand />
      <span className="eyebrow">404 · ESSA CONEXÃO SE PERDEU</span>
      <h1>
        Vamos encontrar
        <br />o caminho de volta?
      </h1>
      <p>A página que você procurou não está por aqui.</p>
      <Link className="button primary" href="/">
        Voltar para a Home
      </Link>
    </main>
  );
}
