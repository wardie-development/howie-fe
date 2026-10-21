'use client';
import { Activity, Coins, ArrowDownLeft, ArrowUpRight, Sparkles } from 'lucide-react';
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
        title="Seu consumo, sem mistério."
        description="Acompanhe o uso da IA e a atividade dos seus agentes."
      />
      <div className="stat-grid">
        {[
          {
            label: 'Tokens de entrada',
            value: summary.usage.input_tokens.toLocaleString('pt-BR'),
            icon: ArrowDownLeft,
            detail: 'Contexto enviado à IA',
            tone: 'blue',
          },
          {
            label: 'Tokens de saída',
            value: summary.usage.output_tokens.toLocaleString('pt-BR'),
            icon: ArrowUpRight,
            detail: 'Conteúdo gerado pela IA',
            tone: 'yellow',
          },
          {
            label: 'Estimativa da IA',
            value: `US$ ${Number(summary.usage.estimated_usd).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}`,
            icon: Coins,
            detail: 'Últimos 30 dias · USD',
            tone: 'green',
          },
          {
            label: 'Execuções com erro',
            value: summary.errors_30d,
            icon: Activity,
            detail: 'Últimos 30 dias',
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
        <Coins size={19} />
        <p>
          Estimativa informativa calculada pelas tarifas configuradas para cada modelo. Não é uma
          fatura e não inclui WhatsApp, infraestrutura ou assinatura.
          {summary.usage.unpriced_models > 0
            ? ` Há ${summary.usage.unpriced_models} modelo(s) sem tarifa configurada, excluídos desta estimativa.`
            : ''}
        </p>
      </div>
      <section className="panel resource-panel">
        <div className="panel-head">
          <div>
            <h2>Atividade dos agentes</h2>
            <p>Execuções e ferramentas utilizadas no atendimento.</p>
          </div>
          <span className="count-tag">{executions.length} execuções</span>
        </div>
        {!executions.length ? (
          <EmptyState
            icon={Sparkles}
            title="O próximo atendimento conta uma história."
            description="Assim que o agente atender, você verá os registros de uso, tokens e ferramentas por aqui."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Agente / cliente</th>
                  <th>Modelo</th>
                  <th>Tokens</th>
                  <th>Ferramentas</th>
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
                      <span className="model-label">{item.model}</span>
                    </td>
                    <td>
                      {((item.input_tokens || 0) + (item.output_tokens || 0)).toLocaleString(
                        'pt-BR',
                      )}
                    </td>
                    <td>
                      {item.tools.length ? (
                        <details className="tool-details">
                          <summary>{item.tools.length} chamada(s)</summary>
                          <ul>
                            {item.tools.map((tool) => (
                              <li key={tool.id}>
                                {tool.name} · {tool.status === 'success' ? 'Sucesso' : 'Erro'}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${item.status === 'success' ? 'positive' : item.status === 'error' ? 'negative' : 'neutral'}`}
                      >
                        {(
                          {
                            success: 'Sucesso',
                            error: 'Erro',
                            running: 'Em andamento',
                            pending: 'Pendente',
                          } as Record<string, string>
                        )[item.status] || item.status}
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
