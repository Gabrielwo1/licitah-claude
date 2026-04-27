'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, Building2,
  Hash, ArrowRight, CheckCircle2, Star, Zap, Shield,
} from 'lucide-react';

// ── Shared input component ────────────────────────────────────────────────────

function Field({
  label, id, name, type = 'text', placeholder, value, onChange, required = false,
  icon: Icon, rightSlot,
}: {
  label: string; id: string; name: string; type?: string; placeholder: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; icon?: any; rightSlot?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
        {label}{required && <span style={{ color: '#FF6600', marginLeft: '3px' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        {Icon && (
          <div style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}>
            <Icon size={15} color={focused ? '#0a1175' : '#9CA3AF'} />
          </div>
        )}
        <input
          id={id} name={name} type={type} placeholder={placeholder}
          value={value} onChange={onChange} required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', height: '44px',
            border: `2px solid ${focused ? '#0a1175' : '#E5E7EB'}`,
            borderRadius: '10px',
            paddingLeft: Icon ? '38px' : '13px',
            paddingRight: rightSlot ? '46px' : '13px',
            fontSize: '13.5px', color: '#0F172A', outline: 'none',
            backgroundColor: focused ? '#fff' : '#FAFAFA',
            transition: 'all 0.15s', boxSizing: 'border-box',
          }}
        />
        {rightSlot}
      </div>
    </div>
  );
}

// ── Left panel ─────────────────────────────────────────────────────────────────

function LeftPanel() {
  return (
    <div style={{
      flex: '0 0 40%', minHeight: '100vh',
      background: 'linear-gradient(145deg, #0a1175 0%, #12218a 40%, #1a3099 70%, #0d1a80 100%)',
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', padding: '48px 40px',
    }}>
      {/* Blobs */}
      <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,102,0,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '80px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,140,255,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Dots */}
      {[[15,10],[85,18],[18,80],[90,65],[55,92]].map(([x,y],i) => (
        <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: i%2===0 ? '7px' : '5px', height: i%2===0 ? '7px' : '5px', borderRadius: '50%', backgroundColor: i%3===0 ? 'rgba(255,102,0,0.7)' : 'rgba(255,255,255,0.2)', pointerEvents: 'none' }} />
      ))}

      {/* Logo */}
      <div style={{ marginBottom: '48px', position: 'relative', zIndex: 1 }}>
        <Image src="/logo.png" alt="Licitah" width={150} height={44} style={{ objectFit: 'contain', height: '40px', width: 'auto', filter: 'brightness(0) invert(1)' }} priority />
      </div>

      {/* Headline */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '36px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: '12px', letterSpacing: '-0.3px' }}>
          Comece gratuitamente.<br />
          <span style={{ color: '#FF6600' }}>Encontre</span> as melhores<br />
          oportunidades.
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
          Cadastre-se e tenha acesso imediato ao maior banco de licitações do Brasil.
        </p>
      </div>

      {/* Plan highlights */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1, marginBottom: '36px' }}>
        {[
          { icon: Zap, color: '#FB923C', label: 'Acesso imediato', desc: 'Sem período de carência' },
          { icon: Star, color: '#FBBF24', label: 'Plano gratuito', desc: 'Use sem cartão de crédito' },
          { icon: Shield, color: '#4ADE80', label: '100% seguro', desc: 'Dados protegidos (LGPD)' },
        ].map(({ icon: Icon, color, label, desc }, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: '11px', padding: '11px 14px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', backgroundColor: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff', marginBottom: '1px' }}>{label}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Testimonial card */}
      <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '14px', padding: '18px' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
          {[...Array(5)].map((_, i) => <Star key={i} size={13} color="#FBBF24" fill="#FBBF24" />)}
        </div>
        <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: '12px', fontStyle: 'italic' }}>
          "Em 2 semanas usando a Licitah, já identificamos 3 contratos relevantes para nossa empresa. A busca inteligente economizou horas de pesquisa manual."
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF6600, #FF8833)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>M</div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Marcos S.</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Diretor Comercial · TechSupply Ltda</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cadastro page ──────────────────────────────────────────────────────────────

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
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
    if (form.senha !== form.confirmarSenha) { setError('As senhas não conferem.'); return; }
    if (form.senha.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }

    setLoading(true);
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome, email: form.email, senha: form.senha,
        telefone: form.telefone, cpf: form.cpf,
        empresaNome: form.empresaNome, empresaCnpj: form.empresaCnpj,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || 'Erro ao criar conta.'); return; }

    await signIn('credentials', { email: form.email, password: form.senha, redirect: false });
    router.push('/dashboard');
  }

  const eyeToggle = (show: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9CA3AF', display: 'flex', alignItems: 'center' }}
    >
      {show ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F0F2FF' }}>
      <LeftPanel />

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', overflowY: 'auto' }}>
        {/* Top nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '20px 44px', gap: '14px', flexShrink: 0 }}>
          <span style={{ fontSize: '13px', color: '#6B7280' }}>Já tem conta?</span>
          <Link href="/login" style={{ backgroundColor: '#0a1175', color: '#fff', borderRadius: '10px', padding: '9px 20px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Entrar <ArrowRight size={13} />
          </Link>
        </div>

        {/* Form area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '8px 48px 48px' }}>
          <div style={{ width: '100%', maxWidth: '460px' }}>

            {/* Title */}
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '30px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '6px' }}>
                Criar conta gratuita.
              </h2>
              <p style={{ fontSize: '13.5px', color: '#94A3B8' }}>Preencha os dados abaixo para começar</p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '10px', padding: '11px 15px', fontSize: '13px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* ── Dados pessoais ── */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a1175', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Dados pessoais</div>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <Field label="Nome completo" id="nome" name="nome" placeholder="Seu nome completo" value={form.nome} onChange={handleChange} required icon={User} />
                  <Field label="Email" id="email" name="email" type="email" placeholder="seu@email.com" value={form.email} onChange={handleChange} required icon={Mail} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Senha<span style={{ color: '#FF6600', marginLeft: '3px' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><Lock size={15} color="#9CA3AF" /></div>
                      <input
                        name="senha" type={showSenha ? 'text' : 'password'} placeholder="Mín. 6 caracteres"
                        value={form.senha} onChange={handleChange} required
                        style={{ width: '100%', height: '44px', border: '2px solid #E5E7EB', borderRadius: '10px', paddingLeft: '38px', paddingRight: '42px', fontSize: '13.5px', color: '#0F172A', outline: 'none', backgroundColor: '#FAFAFA', transition: 'all 0.15s', boxSizing: 'border-box' }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#0a1175'; e.currentTarget.style.backgroundColor = '#fff'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.backgroundColor = '#FAFAFA'; }}
                      />
                      {eyeToggle(showSenha, () => setShowSenha(p => !p))}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Confirmar senha<span style={{ color: '#FF6600', marginLeft: '3px' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><Lock size={15} color="#9CA3AF" /></div>
                      <input
                        name="confirmarSenha" type={showConfirmar ? 'text' : 'password'} placeholder="Repetir senha"
                        value={form.confirmarSenha} onChange={handleChange} required
                        style={{ width: '100%', height: '44px', border: `2px solid ${form.confirmarSenha && form.confirmarSenha !== form.senha ? '#FCA5A5' : '#E5E7EB'}`, borderRadius: '10px', paddingLeft: '38px', paddingRight: '42px', fontSize: '13.5px', color: '#0F172A', outline: 'none', backgroundColor: '#FAFAFA', transition: 'all 0.15s', boxSizing: 'border-box' }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#0a1175'; e.currentTarget.style.backgroundColor = '#fff'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = form.confirmarSenha && form.confirmarSenha !== form.senha ? '#FCA5A5' : '#E5E7EB'; e.currentTarget.style.backgroundColor = '#FAFAFA'; }}
                      />
                      {eyeToggle(showConfirmar, () => setShowConfirmar(p => !p))}
                    </div>
                    {form.confirmarSenha && form.confirmarSenha !== form.senha && (
                      <p style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>As senhas não conferem</p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                  <Field label="Telefone" id="telefone" name="telefone" placeholder="(11) 9 9999-9999" value={form.telefone} onChange={handleChange} icon={Phone} />
                  <Field label="CPF" id="cpf" name="cpf" placeholder="000.000.000-00" value={form.cpf} onChange={handleChange} icon={Hash} />
                </div>
              </div>

              {/* ── Empresa ── */}
              <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a1175', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Empresa <span style={{ color: '#94A3B8', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></div>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Field label="Nome da empresa" id="empresaNome" name="empresaNome" placeholder="Sua empresa" value={form.empresaNome} onChange={handleChange} icon={Building2} />
                  <Field label="CNPJ" id="empresaCnpj" name="empresaCnpj" placeholder="00.000.000/0000-00" value={form.empresaCnpj} onChange={handleChange} icon={Hash} />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: '50px', backgroundColor: loading ? '#6B7280' : '#FF6600',
                  color: '#fff', border: 'none', borderRadius: '12px',
                  fontSize: '14.5px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.15s', boxShadow: loading ? 'none' : '0 4px 16px rgba(255,102,0,0.3)',
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#e05a00'; }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#FF6600'; }}
              >
                {loading ? (
                  <><span style={{ width: '17px', height: '17px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Criando conta...</>
                ) : (
                  <>Criar conta gratuita <ArrowRight size={15} /></>
                )}
              </button>

              {/* Trust line */}
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                {[
                  { icon: CheckCircle2, label: 'Sem cartão de crédito', color: '#4ADE80' },
                  { icon: Shield, label: 'Dados protegidos', color: '#818CF8' },
                ].map(({ icon: Icon, label, color }, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Icon size={13} color={color} strokeWidth={2.5} />
                    <span style={{ fontSize: '11.5px', color: '#9CA3AF' }}>{label}</span>
                  </div>
                ))}
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
