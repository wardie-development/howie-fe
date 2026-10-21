import type { Metadata } from 'next';
import { PublicNav, PublicFooter } from '@/components/brand';
export const metadata: Metadata = {
  title: 'Privacidade',
  alternates: { canonical: '/privacidade' },
};
export default function Privacy() {
  return (
    <main className="marketing legal-page">
      <PublicNav />
      <article>
        <div className="eyebrow">TRANSPARÊNCIA EM CADA CONVERSA</div>
        <h1>Privacidade</h1>
        <p>Esta página descreve o tratamento de dados na versão inicial da Better.</p>
        <h2>Dados que você fornece</h2>
        <p>
          No cadastro, solicitamos nome, e-mail e nome da empresa. Na solicitação de demonstração,
          também coletamos seu telefone e a mensagem enviada. Esses dados são usados para criar seu
          acesso ou responder ao seu pedido.
        </p>
        <h2>Dados da operação</h2>
        <p>
          O portal armazena os cadastros, serviços, profissionais, expedientes, agendamentos e
          conversas vinculados à sua empresa. O acesso é restrito às contas vinculadas ao negócio. O
          uso de inteligência artificial pode envolver o envio do contexto necessário ao provedor
          configurado.
        </p>
        <h2>Sessão e cookies</h2>
        <p>
          Usamos um cookie de sessão para manter seu acesso autenticado. A senha é armazenada de
          forma protegida pelo backend. Esta versão não inclui ferramentas de publicidade ou
          rastreamento de marketing.
        </p>
        <h2>Controle dos dados</h2>
        <p>
          Você pode consultar e editar os dados disponíveis no portal. Solicitações sobre acesso,
          correção ou exclusão de outros dados podem ser feitas pelo mesmo canal de atendimento
          usado para contratar ou solicitar sua demonstração.
        </p>
        <h2>Antes da contratação</h2>
        <p>
          Os detalhes de retenção, responsabilidades e canais formais de privacidade devem integrar
          o contrato e a política aplicáveis à operação comercial. Revise essas informações antes de
          usar a plataforma com dados reais de clientes.
        </p>
      </article>
      <PublicFooter />
    </main>
  );
}
