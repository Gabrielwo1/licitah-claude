'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard, Search, Target, CheckSquare, Star, Building2,
  User, CreditCard, Bell, ShieldCheck, LogOut, X, Menu, Briefcase, FolderOpen, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/dashboard/licitacoes', label: 'Licitações', icon: Search },
  { href: '/dashboard/minhas-licitacoes', label: 'Minhas Licitações', icon: Briefcase },
  { href: '/dashboard/documentacao', label: 'Documentação', icon: FolderOpen },
  { href: '/dashboard/declaracoes', label: 'Declarações', icon: FileText },
  { href: '/dashboard/oportunidades', label: 'Oportunidades', icon: Target },
  { href: '/dashboard/tarefas', label: 'Tarefas', icon: CheckSquare },
  { href: '/dashboard/favoritos', label: 'Favoritos', icon: Star },
  { href: '/dashboard/empresas', label: 'Empresas', icon: Building2 },
  { href: '/dashboard/perfil', label: 'Perfil', icon: User },
  { href: '/dashboard/planos', label: 'Planos', icon: CreditCard },
  { href: '/dashboard/notificacoes', label: 'Notificações', icon: Bell },
];

const adminItems = [
  { href: '/dashboard/admin', label: 'Administração', icon: ShieldCheck },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const funcao = (session?.user as any)?.funcao;
  const isAdmin = funcao === 0 || funcao === 1;
  const empresaNome = (session?.user as any)?.empresaNome;
  const empresaCnpj = (session?.user as any)?.empresaCnpj;

  // Format CNPJ to 00.000.000/0000-00 if it's coming as raw digits
  function formatCnpj(raw?: string | null): string {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 14) return raw; // already formatted or unexpected
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  const allItems = isAdmin ? [...navItems, ...adminItems] : navItems;

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-white z-50 flex flex-col transition-transform duration-300',
          'lg:translate-x-0 lg:static lg:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ borderRight: '1px solid #E5E5E5' }}
      >
        {/* Logo area */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #E5E5E5', backgroundColor: '#fff' }}
        >
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Licitah"
              width={130}
              height={40}
              style={{ objectFit: 'contain', height: '36px', width: 'auto' }}
              priority
            />
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Company card below logo */}
        {empresaNome && (
          <div className="px-4 pt-4 pb-3">
            <div
              className="rounded-xl px-4 py-3"
              style={{
                background: 'linear-gradient(135deg, #1a2540 0%, #0f1830 100%)',
                border: '1px solid #2a3552',
                boxShadow: '0 2px 8px rgba(15,24,48,0.15)',
              }}
            >
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  color: '#8B9ABF',
                  textTransform: 'none',
                  letterSpacing: '0.2px',
                  marginBottom: '4px',
                }}
              >
                Sua Empresa
              </div>
              <div
                className="truncate"
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '-0.2px',
                  lineHeight: 1.25,
                  marginBottom: empresaCnpj ? '4px' : 0,
                }}
                title={empresaNome}
              >
                {empresaNome}
              </div>
              {empresaCnpj && (
                <div
                  className="truncate"
                  style={{
                    fontSize: '11px',
                    color: '#A8B5D6',
                    fontWeight: 500,
                  }}
                  title={formatCnpj(empresaCnpj)}
                >
                  CNPJ: {formatCnpj(empresaCnpj)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {allItems.map((item) => {
            const Icon = item.icon;

            // Gerenciar licitação belongs to "Minhas Licitações", not "Licitações"
            const isGerenciar = pathname.startsWith('/dashboard/licitacoes/gerenciar');

            const isActive =
              (item.href === '/dashboard/minhas-licitacoes' && isGerenciar) ||
              (!isGerenciar && (
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              ));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors'
                )}
                style={
                  isActive
                    ? { backgroundColor: '#080e5e', color: '#fff' }
                    : { backgroundColor: '#f1f1fc', color: '#111' }
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#0a1175';
                    (e.currentTarget as HTMLElement).style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#f1f1fc';
                    (e.currentTarget as HTMLElement).style.color = '#111';
                  }
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div
          className="p-4"
          style={{ borderTop: '1px solid #E5E5E5' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
              style={{ backgroundColor: '#FF6600' }}
            >
              {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: '#262E3A' }}
              >
                {session?.user?.name}
              </p>
              <p className="text-xs truncate" style={{ color: '#7B7B7B' }}>
                {session?.user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 text-sm font-semibold transition-colors w-full px-2 py-1.5 rounded-md hover:bg-red-50"
            style={{ color: '#7B7B7B' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#FF4500';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#7B7B7B';
            }}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-md hover:bg-gray-100"
      style={{ color: '#262E3A' }}
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
