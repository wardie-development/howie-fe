'use client';
import { FormEvent, useState } from 'react';
import { Settings2, ShieldCheck, LoaderCircle, Save, Unplug } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader, Notice } from './ui';
import { useProfile } from './portal-shell';
export default function Settings() {
  const profile = useProfile(),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('auth/me/', {
        method: 'PATCH',
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
      });
      setNotice('Configurações atualizadas.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="SEU ESPAÇO. SUAS ESCOLHAS."
        title="Os detalhes fazem diferença."
        description="Ajuste as informações da sua empresa e as preferências da IA."
      />
      {notice && <Notice message={notice} />}
      <div className="settings-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Informações do negócio</h2>
              <p>Como sua empresa aparece no seu espaço.</p>
            </div>
            <Settings2 size={21} />
          </div>
          <form onSubmit={save} className="settings-form">
            <label>
              Nome da empresa
              <input name="name" defaultValue={profile.company.name} required maxLength={255} />
            </label>
            <label>
              Provedor de inteligência artificial
              <select name="ai_backend" defaultValue={profile.company.ai_backend}>
                <option value="claude">Claude · Haiku</option>
                <option value="gemini">Google Gemini</option>
              </select>
              <small className="field-hint">
                A alteração é aplicada às próximas execuções dos seus agentes.
              </small>
            </label>
            {error && <Notice error message={error} />}
            <button className="button primary small" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}Salvar
              alterações
            </button>
          </form>
        </section>
        <div>
          <section className="panel account-card">
            <span className="icon-box blue-bg">
              <ShieldCheck size={22} />
            </span>
            <h2>Sua conta</h2>
            <p>
              {profile.user.name}
              <br />
              {profile.user.email}
            </p>
            <small>
              Os dados exibidos neste espaço pertencem à empresa {profile.company.name}.
            </small>
          </section>
          <section className="panel account-card connection-card">
            <span className="icon-box yellow-bg">
              <Unplug size={22} />
            </span>
            <h2>Integração com WhatsApp</h2>
            <p>
              A conexão do número precisa ser configurada antes de ativar o atendimento. Solicite
              ajuda na sua demonstração.
            </p>
            <Link className="text-link" href="/demonstracao">
              Combinar minha demonstração
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
