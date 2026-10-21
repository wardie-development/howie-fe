import { notFound } from 'next/navigation';
import Dashboard from '@/components/dashboard';
import Agents from '@/components/agents';
import Agenda from '@/components/agenda';
import Conversations from '@/components/conversations';
import Usage from '@/components/usage';
import Settings from '@/components/settings';
import Reminders from '@/components/reminders';
import Finance from '@/components/finance';
import Resources from '@/components/resources';
export default async function PortalPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = await params;
  const name = section?.join('/') || '';
  if (!name) return <Dashboard />;
  if (name === 'agentes') return <Agents />;
  if (name === 'agenda') return <Agenda />;
  if (name === 'finalizar') return <Finance finalization />;
  if (name === 'financeiro') return <Finance overview />;
  if (name === 'financeiro/atendimentos') return <Finance />;
  if (name === 'lembretes') return <Reminders />;
  if (name === 'conversas') return <Conversations />;
  if (name === 'consumo') return <Usage />;
  if (name === 'configuracoes') return <Settings />;
  // Keep routing serializable: resource configuration belongs to the client module.
  if (
    ['servicos', 'profissionais', 'clientes', 'vinculos', 'expedientes', 'bloqueios'].includes(name)
  )
    return <Resources key={name} section={name} />;
  notFound();
}
