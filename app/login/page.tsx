'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password: senha,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Email ou senha incorretos. Verifique suas credenciais.');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1175] to-[#1a2590] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Licitah"
              width={200}
              height={60}
              style={{ objectFit: 'contain', height: '52px', width: 'auto', filter: 'brightness(0) invert(1)' }}
              priority
            />
          </div>
          <p className="text-white/70 text-sm">Plataforma de Licitações</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Entrar na sua conta</CardTitle>
            <CardDescription>Use seu email e senha para acessar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" loading={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-4">
              Não tem conta?{' '}
              <Link href="/cadastro" className="text-[#0a1175] font-medium hover:underline">
                Cadastre-se grátis
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
