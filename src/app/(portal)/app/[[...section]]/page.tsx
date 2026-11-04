import { notFound, redirect } from 'next/navigation';
import Catalog from '@/components/catalog';
import WorkHours from '@/components/work-hours';
import Notifications from '@/components/notifications';
import Dashboard from '@/components/dashboard';
import Agents from '@/components/agents';
import Agenda from '@/components/agenda';
import Conversations from '@/components/conversations';
import Usage from '@/components/usage';
import Settings from '@/components/settings';
import Reminders from '@/components/reminders';
import Finance from '@/components/finance';
import Resources from '@/components/resources';
import Support from '@/components/support';
import Team from '@/components/team';
export default async function PortalPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = await params;
  const name = section?.join('/') || '';
  if (!name) return <Dashboard />;
  if (name === 'servicos' || name === 'vinculos') redirect('/app/profissionais');
  if (name === 'profissionais') return <Catalog />;
  if (name === 'expedientes') return <WorkHours />;
  if (name === 'notificacoes') return <Notifications />;
  if (name === 'agentes') return <Agents />;
  if (name === 'agenda') return <Agenda />;
  if (name === 'finalizar') return <Finance finalization />;
  if (name === 'financeiro') return <Finance overview />;
  if (name === 'financeiro/atendimentos') return <Finance />;
  if (name === 'lembretes') return <Reminders />;
  if (name === 'conversas') return <Conversations />;
  if (name === 'consumo') return <Usage />;
  if (name === 'suporte') return <Support />;
  if (section?.length === 2 && section[0] === 'suporte' && /^BT-[A-F0-9]{12}$/.test(section[1]))
    return <Support code={section[1]} />;
  if (name === 'equipe') return <Team />;
  if (name === 'configuracoes') return <Settings />;
  // Keep routing serializable: resource configuration belongs to the client module.
  if (['clientes', 'bloqueios'].includes(name)) return <Resources key={name} section={name} />;
  notFound();
}
