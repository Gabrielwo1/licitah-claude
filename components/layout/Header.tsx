'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { MobileMenuButton } from './Sidebar';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const { data: session } = useSession();
  const empresaNome = (session?.user as any)?.empresaNome;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center gap-4">
      <MobileMenuButton onClick={onMenuClick} />

      <div className="flex-1">
        {title && <h1 className="text-lg font-semibold text-gray-800">{title}</h1>}
        {empresaNome && !title && (
          <p className="text-sm text-gray-500">{empresaNome}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/notificacoes"
          className="relative p-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          <Bell className="h-5 w-5 text-gray-600" />
        </Link>

        <Link href="/dashboard/perfil">
          <div className="w-8 h-8 bg-[#0a1175] rounded-full flex items-center justify-center text-white text-sm font-bold">
            {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </Link>
      </div>
    </header>
  );
}
