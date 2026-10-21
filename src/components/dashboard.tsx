'use client';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarDays,
  Sparkles,
  MessageCircle,
  ArrowRight,
  Activity,
  Check,
  Plus,
  Users,
  Clock3,
  Coins,
  CheckCircle2,
} from 'lucide-react';
import { api, money, dateTime } from '@/lib/api';
import type { Dashboard as DashboardData } from '@/lib/types';
import { PageHeader, Loading, ErrorState, EmptyState, useLoad } from './ui';
import { useProfile } from './portal-shell';
export default function Dashboard() {
  const profile = useProfile();
  const { data, error, loading, reload } = useLoad(() => api<DashboardData>('dashboard/'));
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} retry={reload} />;
  const max = Math.max(1, ...data.activity.map((x) => x.count));
  const complete = [data.agents > 0, data.services > 0, data.professionals > 0];
  return (
    <>
      <PageHeader
        eyebrow="UM NOVO DIA. BOAS CONVERSAS."
        title={`Olá, ${profile.user.name.split(' ')[0]}.`}
        description="Um olhar para o seu negócio. Espaço para o que vem pela frente."
      >
        <Link href="/app/agenda" className="button primary small">
          <Plus size={17} /> Novo agendamento
        </Link>
      </PageHeader>
      <div className="welcome-banner">
        <div>
          <span className="eyebrow light">SEU NEGÓCIO EM BOA COMPANHIA</span>
          <h2>
            Menos correria.
            <br />
            Mais tempo para seus clientes.
          </h2>
          <p>Acompanhe seu atendimento e organize os próximos encontros.</p>
          <Link href="/app/agentes">
            Conhecer meus agentes <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="welcome-art">
          <div className="welcome-circle" />
          <CalendarDays size={72} strokeWidth={1.1} />
          <span className="welcome-spark">
            <Sparkles size={25} />
          </span>
          <span className="welcome-art-label">
            <span className="live-dot" /> Tudo no seu ritmo.
          </span>
        </div>
      </div>
      <div className="stat-grid">
        {[
          {
            label: 'Agendamentos hoje',
            value: data.appointments_today,
            icon: CalendarDays,
            detail: 'Seu dia, organizado',
            tone: 'yellow',
          },
          {
            label: 'Conversas',
            value: data.conversations,
            icon: MessageCircle,
            detail: 'Conexões com seus clientes',
            tone: 'blue',
          },
          {
            label: 'Agentes ativos',
            value: `${data.active_agents}/${data.agents}`,
            icon: Sparkles,
            detail: 'No ritmo do atendimento',
            tone: 'purple',
          },
          {
            label: 'Atendimentos da IA',
            value: data.executions_30d,
            icon: Activity,
            detail: 'Execuções nos últimos 30 dias',
            tone: 'green',
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
      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Seus próximos encontros</h2>
              <p>Quem chega por aqui em breve.</p>
            </div>
            <Link href="/app/agenda" className="text-link">
              Ver agenda <ArrowUpRight size={16} />
            </Link>
          </div>
          {data.upcoming.length ? (
            <div className="appointments-list">
              {data.upcoming.map((a) => (
                <Link className="appointment-line" href="/app/agenda" key={a.id}>
                  <span className="date-tile">
                    <strong>
                      {new Date(a.starts_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        timeZone: 'America/Fortaleza',
                      })}
                    </strong>
                    <small>
                      {new Date(a.starts_at)
                        .toLocaleDateString('pt-BR', {
                          month: 'short',
                          timeZone: 'America/Fortaleza',
                        })
                        .replace('.', '')}
                    </small>
                  </span>
                  <div>
                    <strong>{a.client_name}</strong>
                    <small>
                      {a.service_name} · {a.professional_name}
                    </small>
                  </div>
                  <span className="appointment-time">
                    {new Date(a.starts_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'America/Fortaleza',
                    })}
                    <small>{a.status === 'confirmed' ? 'Confirmado' : 'Agendado'}</small>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="O próximo encontro começa aqui."
              description="Quando você ou seu agente fizer um agendamento, ele aparece neste espaço."
              action="Abrir minha agenda"
              href="/app/agenda"
            />
          )}
        </section>
        <section className="panel setup-panel">
          <div className="panel-head">
            <div>
              <h2>Deixe tudo pronto</h2>
              <p>Pequenos passos, boas conexões.</p>
            </div>
            <span className="count-tag">{complete.filter(Boolean).length}/3</span>
          </div>
          <div className="setup-list">
            {[
              {
                done: complete[0],
                title: 'Crie seu primeiro agente',
                sub: 'Dê personalidade ao atendimento.',
                href: '/app/agentes',
              },
              {
                done: complete[1],
                title: 'Cadastre seus serviços',
                sub: 'Valores, duração e descrição.',
                href: '/app/servicos',
              },
              {
                done: complete[2],
                title: 'Apresente sua equipe',
                sub: 'Profissionais e seus expedientes.',
                href: '/app/profissionais',
              },
            ].map((step, i) => (
              <Link key={step.href} href={step.href}>
                <span className={`setup-number ${step.done ? 'complete' : ''}`}>
                  {step.done ? <Check size={16} /> : i + 1}
                </span>
                <div>
                  <strong>{step.title}</strong>
                  <small>{step.sub}</small>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
          <div className="setup-note">
            <Sparkles size={18} />
            <p>Seu agente precisa de serviços, profissionais e horários para consultar a agenda.</p>
          </div>
        </section>
      </div>
      <div className="dashboard-columns bottom-columns">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Conversas em movimento</h2>
              <p>Execuções da IA nos últimos 30 dias.</p>
            </div>
            <Link href="/app/consumo" className="text-link">
              Ver atividade <ArrowUpRight size={16} />
            </Link>
          </div>
          {data.activity.length ? (
            <div className="activity-chart">
              {data.activity.map((day) => (
                <div key={day.day} title={`${day.day}: ${day.count} execuções`}>
                  <span>{day.count}</span>
                  <i style={{ height: `${Math.max(8, (day.count / max) * 110)}px` }} />
                  <small>
                    {day.day.slice(8, 10)}/{day.day.slice(5, 7)}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-activity">
              <Activity size={25} />
              <p>
                A atividade do seu agente aparece aqui
                <br />
                assim que as conversas começarem.
              </p>
            </div>
          )}
        </section>
        <section className="usage-preview">
          <span className="icon-box yellow-bg">
            <Coins size={22} />
          </span>
          <h2>Clareza sobre seu consumo.</h2>
          <p>Acompanhe tokens e estimativas de custo da IA, sem perder de vista sua operação.</p>
          <div>
            <strong>
              {(data.usage.input_tokens + data.usage.output_tokens).toLocaleString('pt-BR')}
            </strong>
            <span>tokens nos últimos 30 dias</span>
          </div>
          <Link href="/app/consumo" className="text-link">
            Explorar meu consumo <ArrowRight size={17} />
          </Link>
        </section>
      </div>
    </>
  );
}
