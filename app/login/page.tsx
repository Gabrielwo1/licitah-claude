'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, TrendingUp, FileSearch, Bell, ArrowRight } from 'lucide-react';

// ── Decorative left panel ──────────────────────────────────────────────────────

function LeftPanel() {
  return (
    <div style={{
      flex: '0 0 46%', minHeight: '100vh',
      background: 'linear-gradient(160deg, #F4F6FF 0%, #EBF0FF 50%, #F0F5FF 100%)',
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', padding: '52px 48px',
      borderRight: '1px solid #E4E9FF',
    }}>
      {/* Soft blobs — very light */}
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,102,0,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,120,255,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '55%', right: '10%', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,102,0,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {/* Subtle decorative dots */}
      {[[12,8],[85,15],[8,70],[90,60],[55,88]].map(([x,y],i) => (
        <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: i%2===0 ? '6px' : '4px', height: i%2===0 ? '6px' : '4px', borderRadius: '50%', backgroundColor: i%3===0 ? 'rgba(255,102,0,0.25)' : 'rgba(100,120,255,0.15)', pointerEvents: 'none' }} />
      ))}

      {/* Logo completa: ícone + wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '56px', position: 'relative', zIndex: 1 }}>
        <Image
          src="/logo.png"
          alt="Licitah"
          width={48}
          height={48}
          style={{ objectFit: 'contain', width: '48px', height: '48px', borderRadius: '12px' }}
          priority
        />
        <div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0B1654', letterSpacing: '-0.5px', lineHeight: 1 }}>Licitah</div>
          <div style={{ fontSize: '11px', color: '#8B9ABF', fontWeight: 500, marginTop: '2px' }}>Plataforma de Licitações</div>
        </div>
      </div>

      {/* Headline */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '44px' }}>
        <h1 style={{ fontSize: '34px', fontWeight: 800, color: '#0B1654', lineHeight: 1.18, marginBottom: '16px', letterSpacing: '-0.8px' }}>
          A plataforma mais<br />
          <span style={{ color: '#FF6600' }}>completa</span> para<br />
          licitações públicas.
        </h1>
        <p style={{ fontSize: '15px', color: '#6B7BA4', lineHeight: 1.65, maxWidth: '310px' }}>
          Monitore, gerencie e ganhe oportunidades com a inteligência do PNCP na palma da mão.
        </p>
      </div>

      {/* Feature list — clean cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1, marginBottom: '44px' }}>
        {[
          { icon: FileSearch, label: 'Busca inteligente no PNCP', desc: 'Pregão, Dispensa e mais modalidades' },
          { icon: Bell, label: 'Alertas de oportunidades', desc: 'Notificações por palavra-chave e região' },
          { icon: TrendingUp, label: 'Gestão completa', desc: 'Tarefas, anotações, arquivos e histórico' },
        ].map(({ icon: Icon, label, desc }, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            backgroundColor: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(200,210,255,0.6)',
            borderRadius: '14px', padding: '14px 16px',
            boxShadow: '0 2px 12px rgba(100,120,200,0.06)',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '11px', flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(255,102,0,0.12) 0%, rgba(255,102,0,0.06) 100%)',
              border: '1px solid rgba(255,102,0,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} color="#FF6600" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0B1654', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '11.5px', color: '#8B9ABF' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats — minimal */}
      <div style={{ display: 'flex', gap: '10px', position: 'relative', zIndex: 1 }}>
        {[
          { num: '2.000+', label: 'licitações/dia' },
          { num: 'R$ 50Bi', label: 'monitorados' },
          { num: '99.9%', label: 'uptime' },
        ].map(({ num, label }, i) => (
          <div key={i} style={{
            flex: 1, textAlign: 'center',
            backgroundColor: 'rgba(255,255,255,0.8)',
            border: '1px solid rgba(200,210,255,0.5)',
            borderRadius: '12px', padding: '14px 8px',
            boxShadow: '0 2px 8px rgba(100,120,200,0.05)',
          }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#FF6600', marginBottom: '3px' }}>{num}</div>
            <div style={{ fontSize: '10.5px', color: '#8B9ABF', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main login page ───────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', { email, password: senha, redirect: false });
    setLoading(false);

    if (result?.error) {
      setError('Email ou senha incorretos. Verifique suas credenciais.');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F0F2FF' }}>
      {/* Left panel */}
      <LeftPanel />

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', position: 'relative' }}>
        {/* Form area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            {/* Title */}
            <div style={{ marginBottom: '36px' }}>
              <h2 style={{ fontSize: '34px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '8px' }}>
                Entrar agora.
              </h2>
              <p style={{ fontSize: '14px', color: '#94A3B8' }}>Informe seus dados abaixo</p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <Mail size={16} color="#9CA3AF" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                    style={{
                      width: '100%', height: '50px', border: '2px solid #E5E7EB',
                      borderRadius: '12px', paddingLeft: '44px', paddingRight: '14px',
                      fontSize: '14px', color: '#0F172A', outline: 'none',
                      transition: 'border-color 0.15s', backgroundColor: '#FAFAFA',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#0a1175'; e.currentTarget.style.backgroundColor = '#fff'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.backgroundColor = '#FAFAFA'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Senha</label>
                  <Link href="#" style={{ fontSize: '12.5px', color: '#0a1175', fontWeight: 600, textDecoration: 'none' }}>
                    Esqueceu a senha?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <Lock size={16} color="#9CA3AF" />
                  </div>
                  <input
                    type={showSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={{
                      width: '100%', height: '50px', border: '2px solid #E5E7EB',
                      borderRadius: '12px', paddingLeft: '44px', paddingRight: '46px',
                      fontSize: '14px', color: '#0F172A', outline: 'none',
                      transition: 'border-color 0.15s', backgroundColor: '#FAFAFA',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#0a1175'; e.currentTarget.style.backgroundColor = '#fff'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.backgroundColor = '#FAFAFA'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(p => !p)}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9CA3AF' }}
                  >
                    {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: '52px', backgroundColor: loading ? '#6B7280' : '#FF6600',
                  color: '#fff', border: 'none', borderRadius: '12px',
                  fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.15s', marginTop: '4px',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(255,102,0,0.35)',
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#e05a00'; }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#FF6600'; }}
              >
                {loading ? (
                  <><span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Entrando...</>
                ) : (
                  <>Entrar <ArrowRight size={16} /></>
                )}
              </button>

              {/* Signup link */}
              <p style={{ textAlign: 'center', fontSize: '13.5px', color: '#6B7280', marginTop: '20px' }}>
                Não tem uma conta?{' '}
                <Link href="/cadastro" style={{ color: '#FF6600', fontWeight: 700, textDecoration: 'none' }}>
                  Cadastre-se grátis →
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
