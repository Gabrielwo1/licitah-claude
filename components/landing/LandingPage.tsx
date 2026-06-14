'use client';

import { useEffect, useRef, useState } from 'react';
import './landing.css';

export default function LandingPage() {
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Load fonts
    if (!document.getElementById('landing-fonts')) {
      const pc1 = document.createElement('link');
      pc1.rel = 'preconnect';
      pc1.href = 'https://fonts.googleapis.com';
      const pc2 = document.createElement('link');
      pc2.rel = 'preconnect';
      pc2.href = 'https://fonts.gstatic.com';
      (pc2 as any).crossOrigin = '';
      const fl = document.createElement('link');
      fl.id = 'landing-fonts';
      fl.rel = 'stylesheet';
      fl.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Sora:wght@300;400;500;600;700&display=swap';
      document.head.appendChild(pc1);
      document.head.appendChild(pc2);
      document.head.appendChild(fl);
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const $ = (s: string, c?: Element | null) => (c || document).querySelector<HTMLElement>(s);
    const $$ = (s: string, c?: Element | null): HTMLElement[] => Array.from((c || document).querySelectorAll<HTMLElement>(s));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const brl = (n: number) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    /* Header scroll */
    const header = $('.header');
    const onScroll = () => { if (header) header.classList.toggle('scrolled', window.scrollY > 24); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* Reveal / count-up / bars */
    const revealEls = $$('.reveal');
    const countEls = $$('[data-count]');
    const chartEls = $$('.chart');
    const counted = new WeakSet<Element>();
    const revealed = new WeakSet<Element>();

    let rafLive = false;
    requestAnimationFrame(() => { rafLive = true; });

    const delayFor = (el: HTMLElement) =>
      el.classList.contains('d4') ? 320 : el.classList.contains('d3') ? 240 :
      el.classList.contains('d2') ? 160 : el.classList.contains('d1') ? 80 : 0;

    const showInstant = (el: HTMLElement) => { el.style.opacity = '1'; el.style.transform = 'none'; el.classList.add('in'); };

    const inView = (el: HTMLElement, ratio = 0.12) => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.height === 0 && r.width === 0) return false;
      const margin = ratio * Math.min(r.height, vh);
      return r.top < vh - margin && r.bottom > margin;
    };

    const revealTween = (el: HTMLElement) => {
      if (revealed.has(el)) return; revealed.add(el);
      if (reduce || !rafLive) { showInstant(el); return; }
      const run = () => {
        const dur = 680, start = performance.now();
        const ease = (t: number) => 1 - Math.pow(1 - t, 3);
        const step = (now: number) => {
          const p = Math.min((now - start) / dur, 1), e = ease(p);
          el.style.opacity = String(e);
          el.style.transform = `translateY(${26 * (1 - e)}px)`;
          if (p < 1) requestAnimationFrame(step); else showInstant(el);
        };
        requestAnimationFrame(step);
      };
      const d = delayFor(el);
      if (d) setTimeout(run, d); else run();
    };

    const growBars = (chart: HTMLElement) => {
      if (reduce || !rafLive) {
        $$('.bar .col', chart).forEach((c) => { (c as HTMLElement).style.height = c.dataset.h + '%'; });
        return;
      }
      $$('.bar .col', chart).forEach((col, i) => {
        const c = col as HTMLElement;
        const target = +(c.dataset.h || 0), dur = 900, start = performance.now() + i * 70;
        const ease = (t: number) => 1 - Math.pow(1 - t, 3);
        const step = (now: number) => {
          const p = Math.max(0, Math.min((now - start) / dur, 1));
          c.style.height = target * ease(p) + '%';
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    };

    const setFinal = (el: HTMLElement) => {
      el.textContent = (+el.dataset.count!).toLocaleString('pt-BR', {
        minimumFractionDigits: +(el.dataset.dec || 0),
        maximumFractionDigits: +(el.dataset.dec || 0),
      });
    };

    const animateCount = (el: HTMLElement) => {
      const target = parseFloat(el.dataset.count!);
      const dec = parseInt(el.dataset.dec || '0', 10);
      const dur = 1400, start = performance.now();
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      const step = (now: number) => {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = (target * ease(p)).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      };
      requestAnimationFrame(step);
    };

    const doCount = (el: HTMLElement) => {
      if (counted.has(el)) return; counted.add(el);
      if (reduce || !rafLive) { setFinal(el); return; }
      animateCount(el);
    };

    let ticking = false;
    const checkAll = () => {
      ticking = false;
      revealEls.forEach((el) => { if (!revealed.has(el) && inView(el)) revealTween(el); });
      countEls.forEach((el) => { if (inView(el, 0.3)) doCount(el); });
      chartEls.forEach((c) => { if (!(c as HTMLElement).dataset.done && inView(c, 0.25)) { (c as HTMLElement).dataset.done = '1'; growBars(c); } });
    };
    const requestCheck = () => { if (!ticking) { ticking = true; setTimeout(checkAll, 16); } };
    window.addEventListener('scroll', requestCheck, { passive: true });
    window.addEventListener('resize', requestCheck);
    window.addEventListener('load', () => setTimeout(checkAll, 60));
    requestAnimationFrame(checkAll);
    setTimeout(checkAll, 250);
    setTimeout(() => {
      revealEls.forEach((el) => { if (!revealed.has(el) && inView(el)) revealTween(el); });
      countEls.forEach((el) => { if (!counted.has(el) && inView(el, 0.3)) doCount(el); });
    }, 900);

    /* Live auction */
    const auctionEl = $('#auction');
    const intervals: ReturnType<typeof setInterval>[] = [];
    if (auctionEl && !reduce) {
      const valEl = $('#auctionVal');
      const list = $('#bidList');
      const cdH = $('#cdH'), cdM = $('#cdM'), cdS = $('#cdS');
      const names = ['Alfa Suprimentos', 'Nordeste Log.', 'TechGov ME', 'Vega Materiais', 'Prime Distrib.', 'Atlas Comercial', 'BR Insumos', 'Delta EPP'];
      const colors = ['#FF6A1A', '#18A7E6', '#2F6BFF', '#15A35B', '#7B61FF', '#F2570A'];
      let current = 3035.00;
      const initials = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
      const renderLeadFlag = () => { if (!list) return; $$('.bid', list).forEach((b, i) => b.classList.toggle('lead', i === 0)); };
      const addBid = () => {
        if (!valEl || !list) return;
        const drop = Math.round(Math.random() * 60 + 15);
        current = Math.max(2100, current - drop);
        valEl.textContent = current.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const name = names[Math.floor(Math.random() * names.length)];
        const c = colors[Math.floor(Math.random() * colors.length)];
        const row = document.createElement('div');
        row.className = 'bid is-new';
        row.innerHTML = `<span class="who"><span class="av" style="background:${c}">${initials(name)}</span>${name}</span><span class="amt">${brl(current)}</span>`;
        list.prepend(row);
        while (list.children.length > 4 && list.lastElementChild) list.removeChild(list.lastElementChild);
        renderLeadFlag();
      };
      addBid(); current -= 40; addBid(); current -= 25; renderLeadFlag();
      intervals.push(setInterval(addBid, 2600));

      let total = 2 * 3600 + 47 * 60 + 12;
      const tick = () => {
        total = total > 0 ? total - 1 : 2 * 3600 + 59 * 60;
        const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
        const pad = (n: number) => String(n).padStart(2, '0');
        if (cdH) cdH.textContent = pad(h);
        if (cdM) cdM.textContent = pad(m);
        if (cdS) cdS.textContent = pad(s);
      };
      tick();
      intervals.push(setInterval(tick, 1000));
    }

    /* Live feed */
    const feed = $('#feedList');
    if (feed && !reduce) {
      const objs = ['Aquisição de equipamentos de informática', 'Contratação de serviços de limpeza predial', 'Fornecimento de material de escritório', 'Locação de veículos para frota oficial', 'Aquisição de mobiliário corporativo', 'Serviços de manutenção predial preventiva', 'Compra de medicamentos e insumos', 'Implantação de sistema de gestão escolar'];
      const orgs = ['Ministério da Defesa', 'Prefeitura de Curitiba', 'Gov. de Minas Gerais', 'TRF 4ª Região', 'UFRJ', 'DNIT', 'Câmara dos Deputados'];
      const cities = ['Brasília · DF', 'Curitiba · PR', 'Belo Horizonte · MG', 'Porto Alegre · RS', 'Rio de Janeiro · RJ', 'Recife · PE'];
      const tags: [string, string][] = [['new', 'Nova'], ['urg', 'Urgente'], ['open', 'Aberta']];
      const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
      const make = () => {
        const t = pick(tags);
        const val = (Math.random() * 480 + 12).toFixed(1);
        const el = document.createElement('article');
        el.className = 'lcard is-new';
        el.innerHTML = `<div class="lcard__obj">${pick(objs)}</div><div class="lcard__meta"><span><b>Órgão:</b> ${pick(orgs)}</span><span>${pick(cities)}</span></div><div class="lcard__side"><span class="tag-st ${t[0]}">${t[1]}</span><span class="lcard__val">R$ ${val} mil</span></div>`;
        feed.prepend(el);
        while (feed.children.length > 4 && feed.lastElementChild) feed.removeChild(feed.lastElementChild);
      };
      for (let i = 0; i < 4; i++) make();
      $$('.lcard', feed).forEach((c) => c.classList.remove('is-new'));
      intervals.push(setInterval(make, 3400));
    }

    /* Hero mock tilt */
    const frame = document.getElementById('heroFrame');
    if (frame && !reduce && window.matchMedia('(pointer:fine)').matches) {
      const br = frame.querySelector<HTMLElement>('.browser');
      if (br) {
        frame.addEventListener('mousemove', (e: MouseEvent) => {
          const r = frame.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          br.style.transform = `rotateY(${-7 + px * 6}deg) rotateX(${3 - py * 6}deg)`;
        });
        frame.addEventListener('mouseleave', () => { br.style.transform = ''; });
      }
    }

    /* Total licitações counter — count-up on mount, slow increment after */
    const liveOpen = document.getElementById('liveOpen');
    if (liveOpen) {
      const TARGET = 103256;
      const FROM = 103000;
      let n = TARGET;

      if (!reduce && rafLive) {
        // Animate count-up on first render
        const dur = 1400;
        const t0 = performance.now();
        const ease = (t: number) => 1 - Math.pow(1 - t, 3);
        const step = (now: number) => {
          const p = Math.min((now - t0) / dur, 1);
          const val = Math.round(FROM + (TARGET - FROM) * ease(p));
          liveOpen.textContent = val.toLocaleString('pt-BR');
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }

      // Slowly increment and flash every 8s
      intervals.push(setInterval(() => {
        n += Math.floor(Math.random() * 3) + 1;
        liveOpen.textContent = n.toLocaleString('pt-BR');
        liveOpen.classList.remove('ticking');
        void (liveOpen as HTMLElement).offsetWidth; // force reflow
        liveOpen.classList.add('ticking');
        setTimeout(() => liveOpen.classList.remove('ticking'), 600);
      }, 8000));
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', requestCheck);
      window.removeEventListener('resize', requestCheck);
      intervals.forEach(clearInterval);
    };
  }, []);

  const ArrowRight = ({ size = 16 }: { size?: number }) => (
    <svg className="arr" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
  const Check = ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );

  return (
    <div className="lp">
      {/* Futuristic background */}
      <div className="bg-field" aria-hidden="true">
        <div className="bg-grid"></div>
        <div className="bg-orb o1"></div>
        <div className="bg-orb o2"></div>
        <div className="bg-orb o3"></div>
      </div>

      {/* HEADER */}
      <header className="header" id="header">
        <div className="wrap header__inner">
          <a className="logo" href="#topo" aria-label="Licitah">
            <img src="/landing/licitah-logo.png" alt="Licitah" />
          </a>
          <nav className="nav">
            <a href="#recursos">Recursos</a>
            <a href="#solucao">Solução</a>
            <a href="#planos">Planos</a>
            <a href="#seguranca">Segurança</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="header__cta">
            <a href="/login" className="btn btn--ghost">Fazer login</a>
            <a href="#planos" className="btn btn--primary">Teste grátis <ArrowRight size={16} /></a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" id="topo">
        <div className="wrap hero__grid">
          <div className="hero__copy">
            <span className="eyebrow reveal">
              <span className="dot"></span>
              + de{' '}
              <span className="eyebrow__num" id="liveOpen">103.256</span>
              <span className="eyebrow__lbl">Licitações em nosso sistema</span>
            </span>
            <h1 className="reveal d1">Encontre, gerencie e <span className="grad">ganhe licitações</span>. Automaticamente.</h1>
            <p className="hero__sub reveal d2">A IA encontra as oportunidades certas, resume editais de 80 páginas em segundos e o robô dá seus lances no Compras.gov. Tudo automático, em um único lugar.</p>
            <div className="hero__actions reveal d3">
              <a href="#planos" className="btn btn--primary btn--lg">Começar grátis <ArrowRight size={18} /></a>
              <a href="#planos" className="btn btn--ghost btn--lg">Ver planos</a>
            </div>
            <p className="hero__micro reveal d3">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              {' '}Sem cartão de crédito · cancele quando quiser
            </p>
            <div className="hero__meta reveal d4">
              <div className="m">
                <b className="m__num"><span data-count="12000">0</span><span className="m__sfx">+</span></b>
                <span className="m__lbl">Licitações monitoradas/dia</span>
              </div>
              <div className="m">
                <b className="m__num"><span className="m__pfx">R$</span><span data-count="2.4" data-dec="1">0</span><span className="m__sfx">bi</span></b>
                <span className="m__lbl">Em contratos acompanhados</span>
              </div>
              <div className="m">
                <b className="m__num"><span data-count="98" data-dec="0">0</span><span className="m__sfx">%</span></b>
                <span className="m__lbl">Prazos cumpridos no prazo</span>
              </div>
            </div>
          </div>

          <div className="appframe reveal d2" id="heroFrame">
            <div className="appframe__glow"></div>
            <div className="browser">
              <div className="browser__bar">
                <div className="browser__dots"><i></i><i></i><i></i></div>
                <div className="browser__url">app.licitah.com.br/gerenciar</div>
              </div>
              <img src="/landing/app-dashboard.png" alt="Painel de gerenciamento de licitação no Licitah" />
            </div>
            <div className="chip-float c1">
              <span className="ic" style={{ background: 'var(--orange-50)', color: 'var(--orange-600)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></svg>
              </span>
              <span className="tx"><b>+38%</b><span>taxa de vitória</span></span>
            </div>
            <div className="chip-float c2">
              <span className="ic" style={{ background: 'rgba(24,167,230,.12)', color: 'var(--cyan)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              </span>
              <span className="tx"><b>Tempo real</b><span>alertas de editais</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST MARQUEE */}
      <section className="trust wrap">
        <p className="trust__label reveal">Quem vende para o governo confia no Licitah</p>
        <div className="marquee reveal d1">
          <div className="marquee__row">
            <span>Pregão Eletrônico</span><span>Concorrência</span><span>Dispensa Eletrônica</span><span>Pregão Presencial</span><span>Credenciamento</span><span>Lei 14.133/21</span>
            <span>Pregão Eletrônico</span><span>Concorrência</span><span>Dispensa Eletrônica</span><span>Pregão Presencial</span><span>Credenciamento</span><span>Lei 14.133/21</span>
          </div>
        </div>
      </section>

      {/* INTRO + STATS */}
      <section className="section section--tight">
        <div className="wrap">
          <div className="s-head reveal">
            <span className="s-tag">Menos burocracia</span>
            <h2>Mais contratos, <span className="o">menos complicação</span></h2>
            <p>Pare de perder editais por desorganização. O Licitah reúne tudo o que você precisa para acompanhar, organizar e vencer licitações com clareza do começo ao fim.</p>
          </div>
          <div className="statband reveal d1">
            <div className="stat">
              <b className="stat__num"><span className="pre">+</span><span data-count="12000">0</span></b>
              <span className="stat__lbl">Licitações monitoradas por dia</span>
            </div>
            <div className="stat">
              <b className="stat__num o"><span className="pre">−</span><span data-count="70">0</span><span className="suf">%</span></b>
              <span className="stat__lbl">Menos tempo organizando documentos</span>
            </div>
            <div className="stat">
              <b className="stat__num"><span className="pre">+</span><span data-count="38">0</span><span className="suf">%</span></b>
              <span className="stat__lbl">Na sua taxa de vitória</span>
            </div>
            <div className="stat">
              <b className="stat__num o"><span data-count="100">0</span><span className="suf">%</span></b>
              <span className="stat__lbl">Online — sem instalar nada</span>
            </div>
          </div>
        </div>
      </section>

      {/* ANTES x DEPOIS */}
      <section className="section section--tight">
        <div className="wrap">
          <div className="s-head reveal">
            <span className="s-tag">Antes &amp; depois</span>
            <h2>Do caos das planilhas <span className="o">ao controle total</span></h2>
            <p>A maioria das empresas perde licitações por não saber que existem ou por não conseguir se organizar a tempo.</p>
          </div>
          <div className="compare">
            <div className="compare__col compare__col--before reveal">
              <div className="compare__head">
                <span className="compare__ic compare__ic--bad">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </span>
                <h3>Sem o Licitah</h3>
              </div>
              <ul className="compare__list">
                <li>Planilhas, e-mails e pastas espalhadas pelo computador</li>
                <li>Editais de dezenas de páginas para ler manualmente</li>
                <li>Prazos guardados "na cabeça" — e oportunidades perdidas</li>
                <li>Lances disputados na correria, sem estratégia</li>
                <li>Certidões vencidas descobertas na hora errada</li>
              </ul>
            </div>
            <div className="compare__arrow" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </div>
            <div className="compare__col compare__col--after reveal d1">
              <div className="compare__head">
                <span className="compare__ic compare__ic--good">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <h3>Com o Licitah</h3>
              </div>
              <ul className="compare__list compare__list--good">
                <li>Tarefas, documentos, anotações e histórico em um painel único</li>
                <li>IA resume cada edital em 30 segundos</li>
                <li>Calendário de prazos automático com alertas diários</li>
                <li>Robô de lances disputando 24h pela sua estratégia</li>
                <li>Habilitação sempre pronta, com aviso de vencimento</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE AUCTION */}
      <section className="section" id="recursos">
        <div className="wrap">
          <div className="s-head reveal">
            <span className="s-tag">Disputa ao vivo</span>
            <h2>Acompanhe a disputa <span className="o">em tempo real</span></h2>
            <p>Veja os lances acontecerem, monitore o cronômetro do pregão e receba cada nova licitação assim que ela é publicada.</p>
          </div>
          <div className="live__grid">
            <div className="auction reveal" id="auction">
              <div className="auction__top">
                <span className="live-badge"><span className="d"></span> AO VIVO</span>
                <span className="auction__id">Pregão Eletrônico · DL/45/2024</span>
              </div>
              <h3>Objeto da disputa</h3>
              <div className="auction__obj">Aquisição de creme de leite — Comando da Marinha</div>
              <div className="auction__price">
                <span className="cur">R$</span>
                <span className="val" id="auctionVal">3.035,00</span>
                <span className="down">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
                  {' '}melhor lance
                </span>
              </div>
              <p className="auction__sub">Menor preço vence · valor atualizado a cada novo lance</p>
              <div className="countdown">
                <div className="cd-box"><b id="cdH">02</b><span>horas</span></div>
                <div className="cd-box"><b id="cdM">47</b><span>min</span></div>
                <div className="cd-box"><b id="cdS">12</b><span>seg</span></div>
              </div>
              <div className="bidlog">
                <p className="bidlog__title">Histórico de lances</p>
                <div className="bidlog__list" id="bidList"></div>
              </div>
            </div>
            <div className="feed reveal d1">
              <div className="feed__head">
                <h3>Novas licitações chegando</h3>
                <span className="count"><i></i> ao vivo agora</span>
              </div>
              <div className="feed__list" id="feedList"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CICLO COMPLETO */}
      <section className="section section--tight" id="solucao">
        <div className="wrap">
          <div className="s-head reveal">
            <span className="s-tag">Ciclo completo</span>
            <h2>Uma solução completa para <span className="o">todo o ciclo licitatório</span></h2>
            <p>Do achado do edital à assinatura do contrato, cada etapa em uma única plataforma.</p>
          </div>
        </div>
      </section>

      {/* FEATURE 1 */}
      <section className="section">
        <div className="wrap feat">
          <div className="feat__copy reveal">
            <span className="s-tag">Encontre</span>
            <h2>Encontre <span className="o">novas licitações</span></h2>
            <p>Monitore oportunidades por órgão, categoria, valor e localização. Receba os boletins certos no seu radar e nunca mais perca um edital relevante.</p>
            <ul className="flist">
              <li><span className="ck"><Check /></span> Filtros inteligentes por situação, órgão e valor</li>
              <li><span className="ck"><Check /></span> Boletins diários com as melhores oportunidades</li>
              <li><span className="ck"><Check /></span> Favorite e gerencie editais em um clique</li>
            </ul>
            <a href="#planos" className="btn btn--navy">Começar agora <ArrowRight size={16} /></a>
          </div>
          <div className="feat__media reveal d2">
            <div className="mediaglow"></div>
            <div className="browser">
              <div className="browser__bar">
                <div className="browser__dots"><i></i><i></i><i></i></div>
                <div className="browser__url">app.licitah.com.br/oportunidades</div>
              </div>
              <img src="/landing/app-opportunities.png" alt="Tela de minhas oportunidades no Licitah" />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE 2 — Documentos */}
      <section className="section">
        <div className="wrap feat rev">
          <div className="feat__media reveal">
            <div className="mediaglow"></div>
            <div className="docshot">
              <img src="/landing/documents.png" alt="Profissional organizando pilha de documentos" />
              <div className="docshot__overlay"></div>
              <div className="docshot__scan"></div>
              <div className="docshot__tag">
                <span className="tag-st open" style={{ background: 'rgba(255,255,255,.16)', color: '#fff', backdropFilter: 'blur(6px)' }}>Tudo digitalizado e válido</span>
              </div>
            </div>
            <div className="doc-pill d1">
              <span className="ic" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              Certidão válida
            </div>
            <div className="doc-pill d2">
              <span className="ic" style={{ background: 'var(--orange-50)', color: 'var(--orange-600)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              </span>
              Vence em 30 dias
            </div>
          </div>
          <div className="feat__copy reveal d1">
            <span className="s-tag">Organize</span>
            <h2>Organize <span className="o">documentos e habilitações</span></h2>
            <p>Acabe com a papelada espalhada. Guarde certidões, declarações e atestados em um cofre digital, com alertas de vencimento e anexo rápido a cada licitação.</p>
            <ul className="flist">
              <li><span className="ck"><Check /></span> Cofre central com todos os seus documentos</li>
              <li><span className="ck"><Check /></span> Alertas automáticos de vencimento</li>
              <li><span className="ck"><Check /></span> Anexe a habilitação em segundos</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ANALYTICS */}
      <section className="section">
        <div className="wrap analytics__grid">
          <div className="feat__copy reveal">
            <span className="s-tag">Acompanhe &amp; analise</span>
            <h2>Acompanhe, analise <span className="o">e ganhe</span></h2>
            <p>Transforme dados em estratégia. Veja seu desempenho, identifique padrões e tome decisões com indicadores claros sobre cada disputa.</p>
            <ul className="flist">
              <li><span className="ck"><Check /></span> Painel de tarefas, prazos e status</li>
              <li><span className="ck"><Check /></span> Indicadores de vitória e desempenho</li>
              <li><span className="ck"><Check /></span> Histórico completo de cada licitação</li>
            </ul>
          </div>
          <div className="dashpanel reveal d1">
            <div className="dashpanel__row">
              <div className="metric">
                <span className="lbl">Concluídas</span>
                <span className="num"><span data-count="22">0</span></span>
                <span className="delta">+12% no mês</span>
              </div>
              <div className="metric">
                <span className="lbl">Em progresso</span>
                <span className="num"><span data-count="32">0</span></span>
                <span className="delta">8 hoje</span>
              </div>
              <div className="metric">
                <span className="lbl">Taxa de vitória</span>
                <span className="num"><span data-count="38">0</span><span className="suf">%</span></span>
                <span className="delta">+6 p.p.</span>
              </div>
            </div>
            <div className="chart">
              <div className="chart__head"><b>Disputas por mês</b><span>últimos 6 meses</span></div>
              <div className="bars">
                <div className="bar"><div className="col" data-h="45"></div><span>Jan</span></div>
                <div className="bar"><div className="col" data-h="62"></div><span>Fev</span></div>
                <div className="bar"><div className="col" data-h="54"></div><span>Mar</span></div>
                <div className="bar"><div className="col" data-h="78"></div><span>Abr</span></div>
                <div className="bar"><div className="col" data-h="70"></div><span>Mai</span></div>
                <div className="bar"><div className="col" data-h="96"></div><span>Jun</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="section">
        <div className="wrap">
          <div className="s-head reveal">
            <span className="s-tag">Por que o Licitah</span>
            <h2>Recursos que trabalham <span className="o">por você</span>, no automático</h2>
            <p>Enquanto você cuida do seu negócio, a Licitah encontra, resume e disputa as licitações certas.</p>
          </div>
          <div className="cards3 cards4">
            <div className="fcard reveal">
              <span className="fcard__tag">Ganhe sem estar presente</span>
              <div className="fi">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M12 6V3M9 13h.01M15 13h.01M9 17h6" /><path d="M4 12H2M22 12h-2" /></svg>
              </div>
              <h3>Robô de Lances</h3>
              <p>O robô dá seus lances no Compras.gov 24h por dia, seguindo sua estratégia. Você só assina o contrato.</p>
            </div>
            <div className="fcard reveal d1">
              <span className="fcard__tag">Decida em minutos, não horas</span>
              <div className="fi">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" /><path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7z" /></svg>
              </div>
              <h3>IA que lê os editais</h3>
              <p>Editais de 80 páginas resumidos em 30 segundos. Saiba se vale a pena disputar sem perder horas lendo.</p>
            </div>
            <div className="fcard reveal d2">
              <span className="fcard__tag">Habilitação sempre pronta</span>
              <div className="fi">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="m9 15 2 2 4-4" /></svg>
              </div>
              <h3>Documentos no automático</h3>
              <p>Cofre digital com alertas de vencimento e declarações geradas sozinhas. Sua empresa sempre habilitada.</p>
            </div>
            <div className="fcard reveal d3">
              <span className="fcard__tag">Zero oportunidade perdida</span>
              <div className="fi">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              </div>
              <h3>Alertas inteligentes</h3>
              <p>Relatório diário de licitações filtradas para o seu segmento, em tempo real, direto do PNCP.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="section section--tight">
        <div className="wrap">
          <div className="s-head reveal">
            <span className="s-tag">A plataforma</span>
            <h2>Tudo que você precisa para <span className="o">vender ao governo</span></h2>
          </div>
          <div className="pillars">
            <div className="pillar reveal">
              <div className="pi">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              </div>
              <h3>Personalização</h3>
              <p>Configure filtros, alertas e fluxos do seu jeito, conforme o perfil da sua operação.</p>
            </div>
            <div className="pillar reveal d1">
              <div className="pi">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9z" /></svg>
              </div>
              <h3>Agilidade</h3>
              <p>Encontre, organize e participe de disputas em poucos cliques, sem retrabalho.</p>
            </div>
            <div className="pillar reveal d2">
              <div className="pi">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
              </div>
              <h3>Segurança</h3>
              <p>Seus dados e documentos protegidos com criptografia e backups automáticos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section" id="planos">
        <div className="wrap">
          <div className="s-head reveal">
            <span className="s-tag">Planos</span>
            <h2>Comece grátis. <span className="o">Cresça quando quiser.</span></h2>
            <p>Escolha o plano ideal para sua empresa vender mais para o governo.</p>
          </div>
          <div className="toggle reveal">
            <div className="toggle__btns">
              <span className="toggle__slider" style={{ transform: billingAnnual ? 'translateX(100%)' : 'translateX(0)' }}></span>
              <button className={!billingAnnual ? 'active' : ''} onClick={() => setBillingAnnual(false)}>Mensal</button>
              <button className={billingAnnual ? 'active' : ''} onClick={() => setBillingAnnual(true)}>Anual</button>
            </div>
            <span className="save-pill">Economize 20%</span>
          </div>
          <div className="plans reveal d1">
            <div className="plan plan--free">
              <div className="plan__name">Plano Free</div>
              <div className="plan__price"><span className="big">Grátis</span></div>
              <p className="plan__desc">Para começar a organizar e acompanhar suas primeiras licitações.</p>
              <ul className="plan__list">
                {['Encontrar licitações abertas', 'Gerenciar até 3 licitações', 'Armazenar documentos', 'Criar até 5 declarações', 'Boletim semanal de oportunidades'].map((item) => (
                  <li key={item}><span className="ck"><Check size={13} /></span> {item}</li>
                ))}
              </ul>
              <a href="/cadastro" className="btn btn--ghost btn--block btn--lg">Criar conta grátis</a>
              <p className="plan__note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                {' '}Sem cartão de crédito
              </p>
            </div>
            <div className="plan plan--pro">
              <span className="plan__badge">Mais escolhido</span>
              <div className="plan__name">Plano Expert</div>
              <div className="plan__price">
                <span className="big">R$ {billingAnnual ? '79,99' : '99,99'}</span>
                <span className="per">{billingAnnual ? '/mês · cobrado anualmente' : '/mês'}</span>
              </div>
              <p className="plan__desc">A combinação ideal para quem quer vender mais e ganhar escala.</p>
              <ul className="plan__list">
                {['Encontrar licitações ilimitadas', 'Gerenciamento ilimitado de licitações', 'Alertas em tempo real de novos editais', 'Controle de vencimento de documentos', 'Relatórios e indicadores de desempenho', 'Declarações personalizadas ilimitadas'].map((item) => (
                  <li key={item}><span className="ck"><Check size={13} /></span> {item}</li>
                ))}
              </ul>
              <a href="/checkout" className="btn btn--primary btn--block btn--lg">Assinar agora <ArrowRight size={17} /></a>
              <p className="plan__note plan__note--light">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>
                {' '}Pagamento seguro via Mercado Pago · cancele quando quiser
              </p>
            </div>
          </div>
          <p className="plan__roi reveal">Um único contrato público ganho paga <b>anos</b> de assinatura. Qual é o risco?</p>
        </div>
      </section>

      {/* SECURITY */}
      <section className="section" id="seguranca">
        <div className="wrap">
          <div className="security reveal">
            <div className="security__glow"></div>
            <div className="security__grid">
              <div>
                <h2>Segurança e confiabilidade no <span style={{ color: 'var(--orange)' }}>centro da plataforma</span></h2>
                <p>Seus dados e documentos protegidos com criptografia de ponta, controle de acesso por usuário e backups diários automáticos.</p>
                <div className="security__badges">
                  <span className="sec-badge">
                    <span className="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
                    Backup diário automático
                  </span>
                  <span className="sec-badge">
                    <span className="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg></span>
                    Criptografia de ponta a ponta
                  </span>
                  <span className="sec-badge">
                    <span className="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></svg></span>
                    Controle de acesso por usuário
                  </span>
                </div>
              </div>
              <div className="shield">
                <div className="ring r1"></div>
                <div className="ring r2"></div>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" id="faq">
        <div className="wrap">
          <div className="s-head reveal">
            <span className="s-tag">FAQ</span>
            <h2>Perguntas <span className="o">frequentes</span></h2>
          </div>
          <div className="faq reveal d1">
            {[
              { q: 'O que é o Licitah?', a: 'O Licitah é uma plataforma completa para empresas que vendem para o governo. Em um só lugar você encontra licitações, organiza documentos, acompanha disputas e gerencia cada edital do início ao fim.' },
              { q: 'Como o Licitah ajuda minha empresa?', a: 'Centralizando todo o ciclo licitatório: alertas de novos editais, cofre de documentos com controle de vencimento, acompanhamento de disputas e relatórios de desempenho para você vencer mais.' },
              { q: 'Quais processos o Licitah atende?', a: 'Pregão eletrônico e presencial, concorrência, dispensa eletrônica, credenciamento e demais modalidades previstas na Lei 14.133/21.' },
              { q: 'O Licitah é seguro?', a: 'Sim. Utilizamos criptografia de ponta a ponta, controle de acesso por usuário e backups diários automáticos para proteger seus dados e documentos.' },
              { q: 'Quanto custa usar o Licitah?', a: 'Você pode começar gratuitamente com o Plano Free. O Plano Expert, com recursos ilimitados, sai por R$ 99,99/mês — ou menos no plano anual.' },
              { q: 'Preciso instalar algum sistema?', a: 'Não. O Licitah é 100% online e funciona direto no navegador. Basta criar sua conta e começar a usar em minutos.' },
              { q: 'Quanto tempo leva para começar a usar?', a: 'Poucos minutos. Após o cadastro, você já pode buscar licitações, subir seus documentos e configurar seus alertas.' },
            ].map((item, i) => (
              <div key={i} className={`qa${openFaq === i ? ' open' : ''}`}>
                <button className="qa__q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {item.q} <span className="pm">+</span>
                </button>
                <div className="qa__a" style={{ maxHeight: openFaq === i ? '300px' : undefined }}>
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="section section--tight">
        <div className="wrap">
          <div className="cta-final reveal">
            <span className="cta-final__badge">Sua concorrência já está usando</span>
            <h2>Vamos vender mais para o governo?</h2>
            <p>Comece grátis hoje, sem cartão de crédito, e tenha todo o ciclo de licitações no automático.</p>
            <div className="hero__actions" style={{ justifyContent: 'center', marginBottom: 0 }}>
              <a href="/cadastro" className="btn btn--navy btn--lg">Começar grátis</a>
              <a href="#planos" className="btn btn--ghost btn--lg">Ver planos</a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="wrap">
          <div className="footer__grid">
            <div className="footer__brand">
              <a className="logo" href="#topo"><img src="/landing/licitah-logo.png" alt="Licitah" /></a>
              <p>A plataforma completa para encontrar, gerenciar e vencer licitações públicas com segurança e agilidade.</p>
            </div>
            <div className="footer__col">
              <h4>Produto</h4>
              <a href="#recursos">Recursos</a>
              <a href="#solucao">Solução</a>
              <a href="#planos">Planos</a>
              <a href="#seguranca">Segurança</a>
            </div>
            <div className="footer__col">
              <h4>Empresa</h4>
              <a href="#">Sobre</a>
              <a href="#">Contato</a>
              <a href="#faq">FAQ</a>
              <a href="#">Suporte</a>
            </div>
            <div className="footer__col">
              <h4>Legal</h4>
              <a href="#">Termos de uso</a>
              <a href="#">Privacidade</a>
              <a href="#">LGPD</a>
            </div>
          </div>
          <div className="footer__bottom">
            <span>© 2026 Licitah. Todos os direitos reservados.</span>
            <span>Feito para quem vende ao governo.</span>
          </div>
        </div>
      </footer>

      {/* WHATSAPP FLOAT */}
      <a className="wa-float" href="https://wa.me/5546999247368?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20a%20Licitah." target="_blank" rel="noopener noreferrer" aria-label="Falar no WhatsApp">
        <span className="wa-float__pulse" aria-hidden="true"></span>
        <svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor" aria-hidden="true">
          <path d="M16.04 4c-6.62 0-12 5.38-12 12 0 2.11.55 4.17 1.6 5.99L4 28l6.18-1.62a11.94 11.94 0 0 0 5.86 1.53h.01c6.62 0 12-5.38 12-12s-5.39-12-12.01-12Zm0 21.94h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.67.96.98-3.58-.24-.37a9.94 9.94 0 0 1-1.52-5.31c0-5.5 4.48-9.97 9.99-9.97 2.67 0 5.17 1.04 7.06 2.93a9.9 9.9 0 0 1 2.92 7.05c0 5.5-4.48 9.97-9.97 9.97Zm5.48-7.46c-.3-.15-1.78-.88-2.05-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.94 1.18-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.78-.73 2.03-1.43.25-.7.25-1.3.17-1.43-.07-.13-.27-.2-.57-.35Z" />
        </svg>
      </a>
    </div>
  );
}
