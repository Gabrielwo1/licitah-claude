'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, TrendingUp, FileSearch, Bell, ArrowRight, CheckCircle2 } from 'lucide-react';

// ── Decorative left panel ──────────────────────────────────────────────────────

function LeftPanel() {
  return (
    <div style={{
      flex: '0 0 46%', minHeight: '100vh',
      background: 'linear-gradient(145deg, #0a1175 0%, #12218a 40%, #1a3099 70%, #0d1a80 100%)',
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', padding: '48px 44px',
    }}>
      {/* Background decorative blobs */}
      <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,102,0,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '60px', left: '-60px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,140,255,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '45%', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,102,0,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Floating dots */}
      {[[18,14],[88,22],[22,75],[92,68],[50,90],[75,12]].map(([x,y],i) => (
        <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: i%2===0 ? '8px' : '5px', height: i%2===0 ? '8px' : '5px', borderRadius: '50%', backgroundColor: i%3===0 ? 'rgba(255,102,0,0.7)' : 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
      ))}

      {/* Logo */}
      <div style={{ marginBottom: '52px', position: 'relative', zIndex: 1 }}>
        <Image src="/logo.png" alt="Licitah" width={160} height={48} style={{ objectFit: 'contain', height: '44px', width: 'auto', filter: 'brightness(0) invert(1)' }} priority />
      </div>

      {/* Headline */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '14px', letterSpacing: '-0.5px' }}>
          A plataforma mais<br />
          <span style={{ color: '#FF6600' }}>completa</span> para<br />
          licitações públicas.
        </h1>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, maxWidth: '320px' }}>
          Monitore, gerencie e ganhe oportunidades com a inteligência do PNCP na palma da mão.
        </p>
      </div>

      {/* Feature pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 1, marginBottom: '44px' }}>
        {[
          { icon: FileSearch, label: 'Busca inteligente no PNCP', desc: 'Pregão, Dispensa e mais modalidades' },
          { icon: Bell, label: 'Alertas de oportunidades', desc: 'Notificações por palavra-chave e região' },
          { icon: TrendingUp, label: 'Gestão completa', desc: 'Tarefas, anotações, arquivos e histórico' },
        ].map(({ icon: Icon, label, desc }, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '13px 16px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255,102,0,0.2)', border: '1px solid rgba(255,102,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color="#FF8833" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '10px', position: 'relative', zIndex: 1 }}>
        {[
          { num: '2.000+', label: 'licitações/dia' },
          { num: 'R$ 50Bi', label: 'monitorados' },
          { num: '99.9%', label: 'disponibilidade' },
        ].map(({ num, label }, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 8px' }}>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#FF6600', marginBottom: '2px' }}>{num}</div>
            <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Bottom floating card */}
      <div style={{ position: 'absolute', bottom: '44px', right: '32px', width: '220px', backgroundColor: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', padding: '16px', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4ADE80' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Oportunidades hoje</span>
        </div>
        {[
          { t: 'Pregão Eletrônico', v: 'R$ 240.000', c: '#4ADE80' },
          { t: 'Dispensa de Licitação', v: 'R$ 85.500', c: '#FB923C' },
          { t: 'Concorrência Pública', v: 'R$ 1.200.000', c: '#818CF8' },
        ].map(({ t, v, c }, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: i < 2 ? '8px' : 0, paddingBottom: i < 2 ? '8px' : 0, borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
            <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.6)', maxWidth: '100px' }}>{t}</span>
            <span style={{ fontSize: '10.5px', fontWeight: 700, color: c }}>{v}</span>
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
        {/* Top nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '24px 48px', gap: '14px' }}>
          <span style={{ fontSize: '13.5px', color: '#6B7280' }}>Não é membro?</span>
          <Link href="/cadastro" style={{
            backgroundColor: '#0a1175', color: '#fff', borderRadius: '10px',
            padding: '10px 22px', fontSize: '13.5px', fontWeight: 700,
            textDecoration: 'none', transition: 'all 0.15s',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
          }}>
            Cadastrar-se <ArrowRight size={14} />
          </Link>
        </div>

        {/* Form area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 48px 48px' }}>
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
            </form>

            {/* Benefits */}
            <div style={{ marginTop: '32px', padding: '18px', backgroundColor: '#F8FAFF', border: '1px solid #E0E7FF', borderRadius: '12px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#0a1175', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✦ Incluso na sua conta</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {['Busca em todas as modalidades do PNCP', 'Alertas por palavra-chave e região', 'Gestão completa com tarefas e anotações'].map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={14} color="#4ADE80" strokeWidth={2.5} />
                    <span style={{ fontSize: '12.5px', color: '#475569' }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
