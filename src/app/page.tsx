import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Clock3,
  MessageCircle,
  CalendarDays,
  Sparkles,
  Users,
  ShieldCheck,
  ChevronDown,
  Play,
  Zap,
  MousePointer2,
} from 'lucide-react';
import { PublicNav, PublicFooter } from '@/components/brand';

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Better',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Plataforma de atendimento com inteligência artificial no WhatsApp e gestão de agendamentos.',
    url: process.env.SITE_URL || 'https://better.wardie.com.br',
  };
  return (
    <main className="marketing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <PublicNav />
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="eyebrow light">
              <span className="live-dot" /> SEU PRÓXIMO PASSO COMEÇA COM UMA CONVERSA
            </div>
            <h1>
              Seu atendimento.
              <br />
              Sua agenda.
              <br />
              <span>Uma boa química.</span>
            </h1>
            <p>
              Transforme o “tem horário?” em um novo agendamento. A Better cuida das conversas para
              você cuidar do seu negócio.
            </p>
            <div className="hero-ctas">
              <Link href="/demonstracao" className="button yellow">
                Quero uma demonstração <ArrowUpRight size={19} />
              </Link>
              <Link href="#como-funciona" className="text-link light">
                <span className="play-circle">
                  <Play size={12} fill="currentColor" />
                </span>{' '}
                Conheça a Better
              </Link>
            </div>
            <div className="hero-notes">
              <span>
                <Check size={15} /> Demonstração gratuita
              </span>
              <span>
                <Check size={15} /> Sem compromisso
              </span>
            </div>
          </div>
          <div
            className="hero-visual"
            aria-label="Exemplo ilustrativo de atendimento e agendamento"
          >
            <div className="visual-orbit" />
            <div className="floating-label top">
              <span className="icon-box yellow-bg">
                <Zap size={17} />
              </span>
              <div>
                <strong>Seu negócio em movimento</strong>
                <small>Até quando você está ocupado.</small>
              </div>
            </div>
            <div className="chat-preview">
              <div className="chat-preview-head">
                <div className="assistant-avatar">
                  <Sparkles size={22} />
                </div>
                <div>
                  <strong>Assistente do seu negócio</strong>
                  <small>
                    <span /> Pronto para ajudar
                  </small>
                </div>
                <span className="chat-ellipsis">•••</span>
              </div>
              <div className="chat-day">EXEMPLO DE CONVERSA</div>
              <div className="chat-bubble incoming">
                Oi! Tem horário para um corte amanhã?<small>10:42</small>
              </div>
              <div className="chat-bubble outgoing">
                Oi, Ana! Tenho sim 😊
                <br />
                Você prefere de manhã ou à tarde?
                <small>
                  10:42 <CheckCheck size={13} />
                </small>
              </div>
              <div className="chat-bubble incoming short">
                À tarde, com a Julia!<small>10:43</small>
              </div>
              <div className="chat-slot">
                <span>
                  <CalendarDays size={16} /> Amanhã, às 14h
                </span>
                <strong>Corte · Julia Martins</strong>
                <small>Uma opção para confirmar com a cliente</small>
              </div>
              <div className="chat-input">
                Uma conversa, muitas possibilidades.
                <MessageCircle size={17} />
              </div>
            </div>
            <div className="floating-label bottom">
              <span className="round-check">
                <Check size={18} />
              </span>
              <div>
                <strong>Do primeiro oi à agenda.</strong>
                <small>Sem perder o fio da conversa.</small>
              </div>
              <MousePointer2 className="cursor-decoration" size={28} />
            </div>
          </div>
        </div>
        <div className="hero-bottom">
          <span>MENOS TAREFAS REPETITIVAS. MAIS POSSIBILIDADES.</span>
          <span>
            Atendimento <i /> Organização <i /> Tempo para você
          </span>
        </div>
      </section>
      <section className="intro-strip">
        <span>Feita para quem atende pessoas.</span>
        <div>
          <span>Salões & barbearias</span>
          <span>Estúdios de beleza</span>
          <span>Negócios com hora marcada</span>
        </div>
      </section>
      <section className="section how-section" id="como-funciona">
        <div className="section-heading">
          <div>
            <div className="eyebrow">SIMPLES POR FORA. INTELIGENTE POR DENTRO.</div>
            <h2>
              Você faz o seu melhor.
              <br />A Better cuida do resto.
            </h2>
          </div>
          <p>Um fluxo conectado, da primeira pergunta ao próximo encontro com seu cliente.</p>
        </div>
        <div className="steps-grid">
          {[
            {
              n: '01',
              icon: MessageCircle,
              title: 'Uma conversa começa',
              text: 'Seu cliente fala com o seu negócio pelo WhatsApp, como já está acostumado.',
            },
            {
              n: '02',
              icon: Sparkles,
              title: 'Seu agente entra em ação',
              text: 'Ele consulta seus serviços, tira dúvidas e busca horários disponíveis na agenda.',
            },
            {
              n: '03',
              icon: CalendarDays,
              title: 'A agenda ganha vida',
              text: 'Com a confirmação do cliente, o horário é reservado para o serviço e profissional escolhidos.',
            },
          ].map(({ n, icon: Icon, title, text }) => (
            <article className="step" key={n}>
              <div className="step-top">
                <span>{n}</span>
                <Icon size={26} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="features-section" id="recursos">
        <div className="section-heading">
          <div>
            <div className="eyebrow">TUDO CONVERSA POR AQUI</div>
            <h2>
              Mais conexão.
              <br />
              Menos abas abertas.
            </h2>
          </div>
          <p>Seu atendimento e a operação do dia a dia, organizados no mesmo lugar.</p>
        </div>
        <div className="feature-layout">
          <article className="feature-large">
            <div className="eyebrow">AGENDA, SEM MALABARISMO</div>
            <h3>
              Um olhar para o dia.
              <br />
              Espaço para o próximo.
            </h3>
            <p>
              Veja horários, clientes e profissionais em uma agenda visual. Encontre o que está
              marcado e o que ainda pode acontecer.
            </p>
            <div className="mini-agenda" aria-label="Exemplo ilustrativo de uma agenda">
              <div className="mini-agenda-head">
                <strong>Sua semana, organizada.</strong>
                <span>Exemplo</span>
              </div>
              <div className="mini-agenda-grid">
                <div className="mini-hours">
                  09:00
                  <br />
                  10:00
                  <br />
                  11:00
                  <br />
                  12:00
                </div>
                {['SEG', 'TER', 'QUA'].map((day, i) => (
                  <div className="mini-day" key={day}>
                    <span>
                      {day} <b>{12 + i}</b>
                    </span>
                    <div className={`mini-event event-${i}`}>
                      <strong>
                        {['Corte feminino', 'Barba & cabelo', 'Design de sobrancelhas'][i]}
                      </strong>
                      <small>{['Ana · Julia', 'Pedro · Lucas', 'Bia · Julia'][i]}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
          <div className="feature-stack">
            <article className="feature-small">
              <span className="icon-box blue-bg">
                <Sparkles size={22} />
              </span>
              <h3>Um agente com o seu jeito.</h3>
              <p>
                Defina o tom do atendimento, as orientações e o que seu agente precisa saber sobre
                seu negócio.
              </p>
              <div className="tone-chips">
                <span>Acolhedor</span>
                <span>Objetivo</span>
                <span>Seu jeito</span>
              </div>
            </article>
            <article className="feature-small yellow-feature">
              <span className="icon-box dark-bg">
                <Users size={22} />
              </span>
              <h3>Sua equipe, no mesmo ritmo.</h3>
              <p>
                Organize profissionais, serviços, valores e expedientes. A informação certa faz o
                atendimento fluir.
              </p>
              <Link href="/cadastro" className="text-link">
                Começar a organizar <ArrowUpRight size={17} />
              </Link>
            </article>
          </div>
        </div>
      </section>
      <section className="section faq-section">
        <div>
          <div className="eyebrow">ANTES DO PRIMEIRO OI</div>
          <h2>
            Boas perguntas.
            <br />
            Respostas diretas.
          </h2>
          <p>
            Quer conhecer a Better no seu cenário?
            <br />
            Vamos conversar.
          </p>
          <Link className="text-link" href="/demonstracao">
            Solicitar demonstração gratuita <ArrowRight size={17} />
          </Link>
        </div>
        <div className="faq-list">
          {[
            [
              'Preciso cadastrar meus serviços?',
              'Sim. Seus serviços, preços, profissionais e horários dão ao agente as informações necessárias para consultar e realizar agendamentos.',
            ],
            [
              'Posso controlar o atendimento da IA?',
              'Sim. Você pode ajustar as orientações do agente e pausar ou retomar o atendimento pelo seu painel.',
            ],
            [
              'Como conheço a Better antes de contratar?',
              'Solicite uma demonstração gratuita. Vamos entender seu negócio e mostrar como o fluxo de atendimento pode funcionar para você.',
            ],
            [
              'Quanto custa?',
              'Os planos serão divulgados em breve. Enquanto isso, você já pode solicitar sua demonstração gratuita e conhecer o produto sem compromisso.',
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <ChevronDown size={19} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="closing-cta">
        <div className="eyebrow light">VAMOS FAZER ESSA CONEXÃO?</div>
        <h2>
          Seu próximo agendamento
          <br />
          pode começar com um <span>oi.</span>
        </h2>
        <Link href="/demonstracao" className="button yellow">
          Conhecer a Better <ArrowUpRight size={19} />
        </Link>
        <p>Demonstração gratuita. Uma conversa sobre o seu negócio.</p>
      </section>
      <PublicFooter />
    </main>
  );
}
