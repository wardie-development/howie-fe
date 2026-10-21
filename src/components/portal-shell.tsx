'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  MessageCircle,
  ChartNoAxesCombined,
  Scissors,
  Users,
  CalendarDays,
  Clock3,
  ContactRound,
  Settings2,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ArrowUpRight,
  CircleHelp,
  PanelLeftClose,
  Ban,
  Wallet,
  Coins,
  CheckCheck,
  ShieldCheck,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { api } from '@/lib/api';
import type { Profile } from '@/lib/types';
const ProfileContext = createContext<Profile | null>(null);
export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('Perfil indisponível');
  return context;
}
const supportGroup = {
  label: 'SUPORTE',
  items: [{ href: '/app/suporte', label: 'Fale conosco', icon: CircleHelp }],
};
const groups = [
  {
    label: 'IA',
    items: [
      { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/app/agentes', label: 'Meus agentes de IA', icon: Sparkles },
      { href: '/app/conversas', label: 'Conversas', icon: MessageCircle },
      { href: '/app/consumo', label: 'Consumo & atividade', icon: ChartNoAxesCombined },
    ],
  },
  {
    label: 'MEUS SERVIÇOS',
    items: [
      { href: '/app/servicos', label: 'Serviços', icon: Scissors },
      { href: '/app/profissionais', label: 'Profissionais', icon: Users },
      { href: '/app/vinculos', label: 'Serviços por profissional', icon: ContactRound },
      { href: '/app/expedientes', label: 'Expedientes', icon: Clock3 },
      { href: '/app/clientes', label: 'Clientes', icon: ContactRound },
    ],
  },
  {
    label: 'AGENDA',
    items: [
      { href: '/app/agenda', label: 'Meus agendamentos', icon: CalendarDays },
      { href: '/app/finalizar', label: 'Finalizar atendimentos', icon: CheckCheck },
      { href: '/app/lembretes', label: 'Lembretes', icon: Clock3 },
      { href: '/app/bloqueios', label: 'Bloqueios de horário', icon: Ban },
    ],
  },
  {
    label: 'FINANCEIRO',
    items: [
      { href: '/app/financeiro', label: 'Visão geral', icon: Wallet },
      { href: '/app/financeiro/atendimentos', label: 'Atendimentos', icon: Coins },
    ],
  },
  supportGroup,
];
export default function PortalShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const path = usePathname(),
    router = useRouter();
  const [open, setOpen] = useState(false),
    [mobile, setMobile] = useState(false),
    [loggingOut, setLoggingOut] = useState(false),
    [error, setError] = useState('');
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(max-width:700px)');
    const resize = () => setMobile(media.matches);
    resize();
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, []);
  useEffect(() => {
    if (!mobile || !open) return;
    const previous = document.activeElement as HTMLElement | null;
    const items = () =>
      Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)') || [],
      );
    items()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'Tab') {
        const all = items(),
          first = all[0],
          last = all[all.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [mobile, open]);
  const restricted = profile.onboarding.stage !== 'ready';
  const navigationGroups = restricted
    ? [
        {
          label: 'SUA CONTA',
          items: [{ href: '/app', label: 'Ativação da conta', icon: ShieldCheck }],
        },
        supportGroup,
      ]
    : groups;
  const title =
    navigationGroups
      .flatMap((g) => g.items)
      .find((item) =>
        item.href === '/app/suporte' ? path.startsWith(item.href) : item.href === path,
      )?.label || 'Configurações';
  async function logout() {
    setLoggingOut(true);
    try {
      await api('auth/logout/', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível sair.');
      setLoggingOut(false);
    }
  }
  return (
    <ProfileContext.Provider value={profile}>
      <div className="portal">
        <a className="skip-link" href="#portal-content">
          Ir para o conteúdo
        </a>
        {open && (
          <button
            className="sidebar-scrim"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          />
        )}
        <aside
          id="workspace-navigation"
          ref={sidebarRef}
          aria-hidden={mobile && !open}
          inert={mobile && !open}
          className={`sidebar ${open ? 'sidebar-open' : ''}`}
        >
          <div className="sidebar-brand">
            <Brand />
            <button
              className="icon-button mobile-only"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>
          <div className="workspace-badge">
            <span>{profile.company.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{profile.company.name}</strong>
              <small>Seu espaço de trabalho</small>
            </div>
          </div>
          <nav aria-label="Gestão da empresa">
            {navigationGroups.map((group) => (
              <div className="nav-group" key={group.label}>
                <span className="nav-label">{group.label}</span>
                {group.items.map(({ href, label, icon: Icon }) => (
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    key={href}
                    aria-current={
                      path === href || (href === '/app/suporte' && path.startsWith(href + '/'))
                        ? 'page'
                        : undefined
                    }
                    className={`sidebar-link ${path === href || (href === '/app/suporte' && path.startsWith(href + '/')) ? 'active' : ''}`}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                    {(path === href ||
                      (href === '/app/suporte' && path.startsWith(href + '/'))) && (
                      <span className="active-dot" />
                    )}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-help">
              <span className="icon-box yellow-bg">
                <Sparkles size={18} />
              </span>
              <strong>Conte com a gente.</strong>
              <p>Abra um chamado e acompanhe a solução por aqui.</p>
              <Link href="/app/suporte">
                Falar com a equipe <ArrowUpRight size={15} />
              </Link>
            </div>
            {!restricted && (
              <Link
                href="/app/configuracoes"
                className={`sidebar-link ${path === '/app/configuracoes' ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <Settings2 size={18} />
                Configurações
              </Link>
            )}
            <button className="sidebar-link logout-button" onClick={logout} disabled={loggingOut}>
              <LogOut size={18} />
              {loggingOut ? 'Saindo...' : 'Sair da conta'}
            </button>
            {error && (
              <p role="alert" className="sidebar-error">
                {error}
              </p>
            )}
          </div>
        </aside>
        <div className="portal-main" inert={mobile && open}>
          <header className="portal-topbar">
            <div>
              <button
                className="icon-button mobile-only"
                onClick={() => setOpen(true)}
                aria-label="Abrir menu"
                aria-controls="workspace-navigation"
                aria-expanded={open}
              >
                <Menu size={21} />
              </button>
              <span className="breadcrumb">
                Seu espaço <span>/</span> <strong>{title}</strong>
              </span>
            </div>
            <div className="topbar-right">
              <Link href="/app/suporte" className="topbar-help">
                <CircleHelp size={17} />
                <span>Preciso de ajuda</span>
              </Link>
              <span className="topbar-divider" />
              <span className="user-avatar">{profile.user.name.slice(0, 1).toUpperCase()}</span>
              <span className="user-name">
                {profile.user.name.split(' ')[0]}
                <small>Minha conta</small>
              </span>
            </div>
          </header>
          <main id="portal-content" className="portal-content">
            {children}
          </main>
          <footer className="portal-footer">
            <span>Feito para deixar seu dia mais leve.</span>
            <span>Better · Seu negócio em boa companhia.</span>
          </footer>
        </div>
      </div>
    </ProfileContext.Provider>
  );
}
