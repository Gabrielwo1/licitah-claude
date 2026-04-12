'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { MobileMenuButton } from './Sidebar';
import { useEffect, useState } from 'react';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch('/api/notificacoes');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const unread = data.filter((n: any) => !n.notificacao_lida).length;
            setUnreadCount(unread);
          }
        }
      } catch {
        // ignore
      }
    }
    fetchUnread();
  }, []);

  const initials = session?.user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-4 px-4 md:px-6 py-3"
      style={{
        backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        borderBottom: '1px solid #E5E5E5',
      }}
    >
      {/* Left: hamburger + page title */}
      <MobileMenuButton onClick={onMenuClick} />

      <div className="flex-1 min-w-0">
        {title && (
          <h1
            className="text-lg font-bold truncate"
            style={{ color: '#262E3A' }}
          >
            {title}
          </h1>
        )}
      </div>

      {/* Right: notifications + avatar */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <Link
          href="/dashboard/notificacoes"
          className="relative p-2 rounded-md hover:bg-gray-100 transition-colors"
          style={{ color: '#262E3A' }}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1"
              style={{ backgroundColor: '#FF6600' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User avatar */}
        <Link href="/dashboard/perfil">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: '#0a1175' }}
          >
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
}
