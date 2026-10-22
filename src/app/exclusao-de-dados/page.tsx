import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicNav, PublicFooter } from '@/components/brand';
export const metadata: Metadata = {
  title: 'Exclusão de dados',
  description:
    'Saiba como solicitar a exclusão dos dados da sua conta Better e da integração com a Meta e acompanhar o pedido pelo suporte.',
  alternates: { canonical: '/exclusao-de-dados' },
};
export default function DataDeletion() {
  return (
    <main className="marketing legal-page">
      <PublicNav />
      <article>
        <div className="eyebrow">VOCÊ NO CONTROLE</div>
        <h1>Exclusão de dados</h1>
        <p>
          Use o suporte da Better para solicitar a exclusão de dados da sua conta ou dos dados
          associados à integração com a Meta.
        </p>
        <h2>Como abrir sua solicitação</h2>
        <ol>
          <li>Entre na conta Better vinculada à sua empresa.</li>
          <li>
            Acesse <Link href="/app/suporte">Fale conosco</Link> e selecione{' '}
            <strong>Novo chamado</strong>.
          </li>
          <li>
            Use o assunto <strong>Solicitação de exclusão de dados</strong>. Informe o nome da
            empresa e quais dados deseja excluir, incluindo a integração com a Meta quando for o
            caso.
          </li>
          <li>
            Guarde o código do chamado. Você poderá acompanhar o status, responder à equipe e
            consultar o histórico pelo mesmo painel.
          </li>
        </ol>
        <p>
          Não envie senhas, tokens da Meta ou documentos pessoais na mensagem inicial. Antes de uma
          ação definitiva, o atendimento poderá solicitar uma confirmação de identidade ou
          esclarecer o escopo do pedido pelo chamado. A abertura do chamado não executa uma exclusão
          automática.
        </p>
        <Link href="/app/suporte" className="button primary">
          Solicitar pelo suporte
        </Link>
        <h2>Dados recebidos pela integração com a Meta</h2>
        <p>
          O pedido pode incluir os dados da conexão do WhatsApp, as credenciais de acesso
          armazenadas pela Better e as conversas associadas à sua empresa. Especifique se deseja
          excluir a conta inteira ou somente determinados dados.
        </p>
        <p>
          Remover uma autorização nas configurações da Meta e solicitar a exclusão dos dados
          armazenados pela Better são ações diferentes. Para solicitar a exclusão na Better, abra o
          chamado descrito acima.
        </p>
        <h2>Se você é cliente de uma empresa que usa a Better</h2>
        <p>
          Se você apenas conversou pelo WhatsApp com uma empresa atendida pela Better e não tem uma
          conta no painel, encaminhe sua solicitação diretamente à empresa com quem conversou. Ela
          poderá identificar o atendimento e solicitar o tratamento dos dados vinculados ao seu
          espaço.
        </p>
        <h2>Outras informações</h2>
        <p>
          Consulte também a nossa <Link href="/privacidade">página de privacidade</Link> para
          conhecer os dados utilizados pela plataforma.
        </p>
      </article>
      <PublicFooter />
    </main>
  );
}
