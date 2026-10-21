'use client';
import { Activity, CalendarDays, MessageCircle, Users, Sparkles } from 'lucide-react';
import { api, list, dateTime } from '@/lib/api';
import type { Dashboard, Execution } from '@/lib/types';
import { PageHeader, Loading, ErrorState, EmptyState, useLoad } from './ui';
export default function Usage() {
  const state = useLoad(async () => ({
    summary: await api<Dashboard>('dashboard/'),
    executions: await list<Execution>('executions/'),
  }));
  if (state.loading) return <Loading />;
  if (state.error || !state.data) return <ErrorState message={state.error} retry={state.reload} />;
  const { summary, executions } = state.data;
  return (
    <>
      <PageHeader
        eyebrow="CLAREZA A CADA INTERAÇÃO"
        title="Seu atendimento em números."
        description="Veja quem recebeu atendimento e acompanhe as ações dos seus agentes nos últimos 30 dias."
      />
      <div className="stat-grid">
        {[
          {
            label: 'Conversas atendidas',
            value: summary.conversations_30d.toLocaleString('pt-BR'),
            icon: MessageCircle,
            detail: 'Conversas com ao menos uma interação concluída',
            tone: 'blue',
          },
          {
            label: 'Clientes atendidos',
            value: summary.clients_assisted_30d.toLocaleString('pt-BR'),
            icon: Users,
            detail: 'Cada cliente contado uma única vez',
            tone: 'yellow',
          },
          {
            label: 'Interações concluídas',
            value: summary.interactions_30d.toLocaleString('pt-BR'),
            icon: Activity,
            detail: 'Solicitações processadas pelos agentes',
            tone: 'green',
          },
          {
            label: 'Agendamentos criados',
            value: summary.appointments_created_30d.toLocaleString('pt-BR'),
            icon: CalendarDays,
            detail: 'Pelo agente ou pela equipe · exclui cancelados',
            tone: 'purple',
          },
        ].map(({ label, value, icon: Icon, detail, tone }) => (
          <article className="stat-card" key={label}>
            <div>
              <span>{label}</span>
              <span className={`stat-icon ${tone}`}>
                <Icon size={19} />
              </span>
            </div>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </div>
      <div className="info-strip">
        <MessageCircle size={19} />
        <p>
          Uma conversa pode ter várias interações. Aqui você acompanha o atendimento realizado nos
          últimos 30 dias, sem contar novas tentativas da mesma solicitação.
        </p>
      </div>
      <section className="panel resource-panel">
        <div className="panel-head">
          <div>
            <h2>Atividade dos agentes</h2>
            <p>Histórico recente de atendimentos e ações na sua agenda.</p>
          </div>
          <span className="count-tag">{executions.length} registros</span>
        </div>
        {!executions.length ? (
          <EmptyState
            icon={Sparkles}
            title="O próximo atendimento conta uma história."
            description="Assim que as conversas começarem, você verá quem foi atendido e quais ações o agente realizou."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Agente / cliente</th>
                  <th>Ações no atendimento</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((item) => (
                  <tr key={item.id}>
                    <td>{dateTime(item.created_at)}</td>
                    <td className="table-primary">
                      {item.agent_name}
                      <small className="table-sub">{item.client_name}</small>
                    </td>
                    <td>
                      {item.tools.length ? (
                        <details className="tool-details">
                          <summary>{item.tools.length} ação(ões)</summary>
                          <ul>
                            {item.tools.map((tool) => (
                              <li key={tool.id}>
                                {tool.label} ·{' '}
                                {(
                                  {
                                    success: 'Concluída',
                                    error: 'Não concluída',
                                    running: 'Em andamento',
                                    pending: 'Aguardando',
                                  } as Record<string, string>
                                )[tool.status] || 'Aguardando'}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        'Conversa com o cliente'
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${item.status === 'success' ? 'positive' : item.status === 'error' ? 'negative' : 'neutral'}`}
                      >
                        {(
                          {
                            success: 'Concluído',
                            error: 'Precisa de atenção',
                            running: 'Em andamento',
                            pending: 'Aguardando',
                          } as Record<string, string>
                        )[item.status] || 'Aguardando'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
