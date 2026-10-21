import type { Metadata } from 'next';
import { PublicNav, PublicFooter } from '@/components/brand';
export const metadata: Metadata = { title: 'Termos de uso', alternates: { canonical: '/termos' } };
export default function Terms() {
  return (
    <main className="marketing legal-page">
      <PublicNav />
      <article>
        <div className="eyebrow">UMA RELAÇÃO CLARA DESDE O INÍCIO</div>
        <h1>Termos de uso</h1>
        <p>
          A Better oferece recursos para organizar atendimento com IA, serviços e agendamentos. Esta
          é uma versão inicial do produto.
        </p>
        <h2>Sua conta</h2>
        <p>
          Mantenha seus dados corretos, proteja suas credenciais e utilize apenas informações que
          você tem autorização para tratar. O cadastro cria um espaço vinculado à sua empresa.
        </p>
        <h2>Configuração e atendimento</h2>
        <p>
          Você é responsável pelas orientações do agente, serviços, preços e horários cadastrados.
          Revise os resultados da IA e use os controles de pausa quando necessário. Conectar o
          WhatsApp depende da configuração e das autorizações aplicáveis à integração.
        </p>
        <h2>Planos e demonstração</h2>
        <p>
          Os planos ainda não estão publicados. Solicitar uma demonstração ou criar uma conta nesta
          versão não gera cobrança automática. As condições comerciais serão apresentadas antes de
          qualquer contratação.
        </p>
        <h2>Disponibilidade e evolução</h2>
        <p>
          O produto pode receber alterações durante sua evolução. Serviços de terceiros, como
          provedores de IA e mensageria, têm disponibilidade e condições próprias. As condições
          completas de prestação do serviço serão formalizadas na contratação.
        </p>
      </article>
      <PublicFooter />
    </main>
  );
}
