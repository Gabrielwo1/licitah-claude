'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface User {
  usuario_id: number;
  usuario_display: string;
  usuario_email: string;
  usuario_funcao: number;
  usuario_ativo: number;
}

interface Props {
  users: User[];
}

export function AdminUsersTable({ users }: Props) {
  const [search, setSearch] = useState('');
  const [localUsers, setLocalUsers] = useState<User[]>(users);

  const funcaoLabel = (f: number) => {
    if (f === 0) return 'Super Admin';
    if (f === 1) return 'Admin';
    return 'Usuário';
  };

  async function toggleAtivo(user: User) {
    const newAtivo = user.usuario_ativo === 1 ? 0 : 1;
    const res = await fetch(`/api/admin/usuarios/${user.usuario_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: newAtivo }),
    });
    if (res.ok) {
      setLocalUsers(prev => prev.map(u =>
        u.usuario_id === user.usuario_id ? { ...u, usuario_ativo: newAtivo } : u
      ));
    }
  }

  const filtered = localUsers.filter(u =>
    (u.usuario_display || '').toLowerCase().includes(search.toLowerCase()) ||
    u.usuario_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="p-4 border-b">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Função</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((u) => (
              <tr key={u.usuario_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.usuario_display}</td>
                <td className="px-4 py-3 text-gray-600">{u.usuario_email}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.usuario_funcao === 0 ? 'default' : u.usuario_funcao === 1 ? 'orange' : 'secondary'}>
                    {funcaoLabel(u.usuario_funcao)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.usuario_ativo === 1 ? 'success' : 'destructive'}>
                    {u.usuario_ativo === 1 ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant={u.usuario_ativo === 1 ? 'outline' : 'default'}
                    onClick={() => toggleAtivo(u)}
                  >
                    {u.usuario_ativo === 1 ? 'Desativar' : 'Ativar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center py-8 text-gray-400 text-sm">Nenhum usuário encontrado.</p>
        )}
      </div>
    </div>
  );
}
