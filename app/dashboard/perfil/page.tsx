'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { User, Lock, Save, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PerfilPage() {
  const { data: session, update } = useSession();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [passwordForm, setPasswordForm] = useState({ atual: '', nova: '', confirmar: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  const user = session?.user as any;

  useEffect(() => {
    fetch('/api/perfil')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.whatsapp) setWhatsapp(d.whatsapp); })
      .catch(() => null);
  }, []);

  function formatWhatsapp(value: string): string {
    const digits = value.replace(/\D/g, '').substring(0, 13);
    if (digits.length <= 2)  return digits;
    if (digits.length <= 4)  return `+${digits.slice(0, 2)} (${digits.slice(2)}`;
    if (digits.length <= 9)  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`;
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    const formData = new FormData(e.currentTarget);
    const nome  = formData.get('nome') as string;
    const email = formData.get('email') as string;

    try {
      const res = await fetch('/api/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, whatsapp }),
      });
      if (res.ok) {
        setSuccess('Perfil atualizado com sucesso!');
        await update({ name: nome, email });
      } else {
        const d = await res.json();
        setError(d.error || 'Erro ao atualizar perfil.');
      }
    } catch {
      setError('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (passwordForm.nova !== passwordForm.confirmar) {
      setPwError('As senhas não conferem.');
      return;
    }
    if (passwordForm.nova.length < 6) {
      setPwError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch('/api/perfil/senha', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual: passwordForm.atual, novaSenha: passwordForm.nova }),
      });
      if (res.ok) {
        setPwSuccess('Senha alterada com sucesso!');
        setPasswordForm({ atual: '', nova: '', confirmar: '' });
      } else {
        const d = await res.json();
        setPwError(d.error || 'Erro ao alterar senha.');
      }
    } catch {
      setPwError('Erro de conexão.');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <User className="h-5 w-5 text-[#0a1175]" />
        <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-[#0a1175] rounded-full flex items-center justify-center text-white text-2xl font-bold">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <p className="text-xs text-gray-400">
            {user?.funcao === 0 ? 'Super Admin' : user?.funcao === 1 ? 'Admin' : 'Usuário'}
          </p>
        </div>
      </div>

      {/* Profile form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informações pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-md px-4 py-3 text-sm">{success}</div>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" name="nome" defaultValue={user?.name || ''} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={user?.email || ''} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                WhatsApp para alertas
              </Label>
              <Input
                id="whatsapp"
                placeholder="+55 (11) 99999-9999"
                value={whatsapp}
                onChange={e => setWhatsapp(formatWhatsapp(e.target.value))}
              />
              <p className="text-xs text-gray-400">Receberá alertas de licitações urgentes e mudanças de situação.</p>
            </div>
            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4" />
              Salvar alterações
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Alterar senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {pwSuccess && <div className="bg-green-50 border border-green-200 text-green-700 rounded-md px-4 py-3 text-sm">{pwSuccess}</div>}
            {pwError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">{pwError}</div>}
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <Input
                type="password"
                placeholder="Sua senha atual"
                value={passwordForm.atual}
                onChange={(e) => setPasswordForm(p => ({ ...p, atual: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={passwordForm.nova}
                onChange={(e) => setPasswordForm(p => ({ ...p, nova: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                placeholder="Repetir a nova senha"
                value={passwordForm.confirmar}
                onChange={(e) => setPasswordForm(p => ({ ...p, confirmar: e.target.value }))}
                required
              />
            </div>
            <Button type="submit" loading={pwLoading}>
              Alterar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
