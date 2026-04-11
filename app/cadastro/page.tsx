'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', confirmarSenha: '',
    telefone: '', cpf: '', empresaNome: '', empresaCnpj: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.senha !== form.confirmarSenha) {
      setError('As senhas não conferem.');
      return;
    }
    if (form.senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        telefone: form.telefone,
        cpf: form.cpf,
        empresaNome: form.empresaNome,
        empresaCnpj: form.empresaCnpj,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Erro ao criar conta.');
      return;
    }

    // Auto login
    await signIn('credentials', {
      email: form.email,
      password: form.senha,
      redirect: false,
    });

    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1175] to-[#1a2590] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#ff6600] rounded-xl flex items-center justify-center font-bold text-white text-lg">
              L
            </div>
            <span className="text-2xl font-bold text-white">Licitah</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar conta gratuita</CardTitle>
            <CardDescription>Comece a monitorar licitações agora mesmo</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo *</Label>
                  <Input id="nome" name="nome" placeholder="Seu nome" value={form.nome} onChange={handleChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" placeholder="seu@email.com" value={form.email} onChange={handleChange} required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha *</Label>
                    <Input id="senha" name="senha" type="password" placeholder="Mín. 6 caracteres" value={form.senha} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmarSenha">Confirmar senha *</Label>
                    <Input id="confirmarSenha" name="confirmarSenha" type="password" placeholder="Repetir senha" value={form.confirmarSenha} onChange={handleChange} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" name="telefone" placeholder="(11) 9 9999-9999" value={form.telefone} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" name="cpf" placeholder="000.000.000-00" value={form.cpf} onChange={handleChange} />
                  </div>
                </div>

                <div className="border-t pt-3 mt-1">
                  <p className="text-sm text-gray-500 mb-3">Empresa (opcional)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="empresaNome">Nome da empresa</Label>
                      <Input id="empresaNome" name="empresaNome" placeholder="Sua empresa" value={form.empresaNome} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="empresaCnpj">CNPJ</Label>
                      <Input id="empresaCnpj" name="empresaCnpj" placeholder="00.000.000/0000-00" value={form.empresaCnpj} onChange={handleChange} />
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" loading={loading}>
                {loading ? 'Criando conta...' : 'Criar conta'}
              </Button>

              <p className="text-center text-sm text-gray-500">
                Já tem conta?{' '}
                <Link href="/login" className="text-[#0a1175] font-medium hover:underline">
                  Entrar
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
