'use client';
import { FormEvent, useState } from 'react';
import {
  MailPlus,
  ShieldCheck,
  Users,
  Pencil,
  Trash2,
  UserRoundCheck,
  UserRoundX,
  LoaderCircle,
} from 'lucide-react';
import { api, dateTime } from '@/lib/api';
import { useProfile } from './portal-shell';
import { PageHeader, Notice, Loading, ErrorState, Modal } from './ui';
import { useLoad } from './ui';

type Member = {
  id: number;
  name: string;
  email: string;
  is_master: boolean;
  status: 'active' | 'inactive';
};
type Invitation = {
  id: number;
  name: string;
  email: string;
  status: 'pending' | 'expired';
  delivery_status: string;
  expires_at: string;
};
type TeamData = { members: Member[]; invitations: Invitation[] };
type Action =
  | { kind: 'invite' }
  | { kind: 'edit'; member: Member }
  | { kind: 'access'; member: Member }
  | { kind: 'revoke'; invitation: Invitation };

export default function Team() {
  const profile = useProfile();
  if (!profile.user.is_master)
    return <Notice message="Somente o Master da empresa pode gerenciar a equipe." />;
  return <TeamManagement />;
}
function TeamManagement() {
  const { data, loading, error, reload } = useLoad(() => api<TeamData>('team/'));
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [deliveryFailed, setDeliveryFailed] = useState(false);
  function open(value: Action) {
    setFormError('');
    setAction(value);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setFormError('');
    setNotice('');
    setDeliveryFailed(false);
    try {
      if (action.kind === 'invite') {
        const result = await api<{ detail: string; invitation: Invitation }>('team/', {
          method: 'POST',
          body: JSON.stringify(values),
        });
        setNotice(result.detail);
        setDeliveryFailed(result.invitation.delivery_status === 'failed');
      } else if (action.kind === 'revoke') {
        await api(`team/invitations/${action.invitation.id}/`, { method: 'DELETE' });
        setNotice('Convite excluído. O link anterior não pode mais ser usado.');
      } else {
        await api(`team/members/${action.member.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(
            action.kind === 'edit' ? values : { is_active: action.member.status !== 'active' },
          ),
        });
        setNotice(
          action.kind === 'edit'
            ? 'Nome atualizado.'
            : action.member.status === 'active'
              ? 'Acesso desativado e sessões encerradas.'
              : 'Acesso reativado. O usuário pode entrar novamente.',
        );
      }
      setAction(null);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível concluir.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="GENTE BOA, TRABALHANDO JUNTO"
        title="Sua equipe, no mesmo lugar."
        description="Convide pessoas e acompanhe quem tem acesso à sua empresa."
      >
        <button className="button primary" onClick={() => open({ kind: 'invite' })}>
          <MailPlus size={18} />
          Convidar pessoa
        </button>
      </PageHeader>
      <div className="team-master-note">
        <ShieldCheck size={21} />
        <div>
          <strong>Você é o Master desta empresa.</strong>
          <p>
            Somente você gerencia a equipe. Sua conta está protegida contra alterações por outros
            usuários.
          </p>
        </div>
      </div>
      {notice && <Notice message={notice} error={deliveryFailed} />}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : (
        data && (
          <>
            <section className="panel team-panel">
              <div className="panel-head">
                <div>
                  <h2>Pessoas da empresa</h2>
                  <p>{data.members.filter((m) => m.status === 'active').length} com acesso ativo</p>
                </div>
                <Users size={22} />
              </div>
              <div className="team-list">
                {data.members.map((member) => (
                  <article className="team-person" key={member.id}>
                    <span className={`team-avatar ${member.is_master ? 'team-avatar-master' : ''}`}>
                      {(member.name || member.email).slice(0, 1).toUpperCase()}
                    </span>
                    <div className="team-person-info">
                      <strong>{member.name || 'Sem nome'}</strong>
                      <span>{member.email}</span>
                    </div>
                    <span className={`team-status ${member.is_master ? 'master' : member.status}`}>
                      {member.is_master
                        ? 'Master'
                        : member.status === 'active'
                          ? 'Ativo'
                          : 'Inativo'}
                    </span>
                    <div className="team-actions">
                      {member.is_master ? (
                        <span className="team-protected">
                          <ShieldCheck size={15} />
                          Conta protegida
                        </span>
                      ) : (
                        <>
                          <button
                            className="button secondary small"
                            onClick={() => open({ kind: 'edit', member })}
                            aria-label={`Editar ${member.name || member.email}`}
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                          <button
                            className="button secondary small"
                            onClick={() => open({ kind: 'access', member })}
                          >
                            {member.status === 'active' ? (
                              <UserRoundX size={14} />
                            ) : (
                              <UserRoundCheck size={14} />
                            )}
                            {member.status === 'active' ? 'Desativar' : 'Reativar'}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <section className="panel team-panel">
              <div className="panel-head">
                <div>
                  <h2>Convites pendentes</h2>
                  <p>O acesso só é ativado depois que a pessoa define a senha.</p>
                </div>
                <MailPlus size={22} />
              </div>
              {!data.invitations.length ? (
                <div className="team-empty">
                  <MailPlus size={27} />
                  <strong>Nenhum convite pendente.</strong>
                  <p>Quando você convidar alguém, poderá acompanhar por aqui.</p>
                </div>
              ) : (
                <div className="team-list">
                  {data.invitations.map((invite) => (
                    <article className="team-person" key={invite.id}>
                      <span className="team-avatar">
                        <MailPlus size={20} />
                      </span>
                      <div className="team-person-info">
                        <strong>{invite.name}</strong>
                        <span>{invite.email}</span>
                        <small>
                          {invite.delivery_status === 'failed'
                            ? 'Falha no envio. Exclua e crie um novo convite.'
                            : invite.delivery_status === 'pending'
                              ? 'Envio em processamento. Atualize a página para conferir.'
                              : `Validade: ${dateTime(invite.expires_at)}`}
                        </small>
                      </div>
                      <span className={`team-status ${invite.status}`}>
                        {invite.status === 'expired' ? 'Expirado' : 'Pendente'}
                      </span>
                      <button
                        className="button secondary small"
                        onClick={() => open({ kind: 'revoke', invitation: invite })}
                        aria-label={`Excluir convite de ${invite.name}`}
                      >
                        <Trash2 size={14} />
                        Excluir convite
                      </button>
                    </article>
                  ))}
                </div>
              )}
              <p className="team-footnote">
                Para reenviar, exclua o convite e crie um novo. O link anterior será invalidado.
                Limite de 20 convites por hora e 100 em 24 horas por empresa.
              </p>
            </section>
          </>
        )
      )}
      {action && (
        <Modal
          title={
            action.kind === 'invite'
              ? 'Convide alguém para a equipe'
              : action.kind === 'edit'
                ? 'Editar pessoa'
                : action.kind === 'revoke'
                  ? 'Excluir convite?'
                  : action.member.status === 'active'
                    ? 'Desativar acesso?'
                    : 'Reativar acesso?'
          }
          description={
            action.kind === 'invite'
              ? 'Enviaremos um link seguro, válido por 24 horas, para a pessoa criar sua senha.'
              : action.kind === 'revoke'
                ? 'Este link deixará de funcionar. Depois, você poderá criar outro convite.'
                : action.kind === 'access'
                  ? action.member.status === 'active'
                    ? 'O usuário perderá o acesso imediatamente e suas sessões serão encerradas.'
                    : 'O usuário poderá entrar novamente com sua senha atual.'
                  : 'O e-mail de acesso permanece o mesmo.'
          }
          onClose={() => {
            if (!busy) setAction(null);
          }}
        >
          <form className="modal-form" onSubmit={submit}>
            {(action.kind === 'invite' || action.kind === 'edit') && (
              <label>
                Nome
                <input
                  name="name"
                  required
                  maxLength={150}
                  autoComplete="name"
                  defaultValue={action.kind === 'edit' ? action.member.name : ''}
                />
              </label>
            )}
            {action.kind === 'invite' && (
              <label>
                E-mail
                <input name="email" type="email" required maxLength={150} autoComplete="email" />
                <small>Use um e-mail que ainda não tenha conta na Better.</small>
              </label>
            )}
            {action.kind === 'revoke' && (
              <p>
                {action.invitation.name} · {action.invitation.email}
              </p>
            )}
            {action.kind === 'access' && (
              <p>
                {action.member.name} · {action.member.email}
              </p>
            )}
            {formError && <Notice error message={formError} />}
            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={busy}>
                {busy && <LoaderCircle size={16} className="spin" />}
                {busy
                  ? 'Aguarde...'
                  : action.kind === 'invite'
                    ? 'Enviar convite'
                    : action.kind === 'revoke'
                      ? 'Excluir convite'
                      : action.kind === 'edit'
                        ? 'Salvar nome'
                        : 'Confirmar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
