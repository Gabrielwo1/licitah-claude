/**
 * Automação Playwright — Compras.gov (ComprasNet / SIASG)
 *
 * Sistema ASP legado em comprasnet.gov.br
 *
 * MODO DEBUG: defina DEBUG_SCREENSHOTS=true nas env vars para salvar
 * um screenshot de cada etapa em /opt/licitah-worker/debug/
 * Isso permite validar os seletores sem acesso ao portal ao vivo.
 *
 * Após rodar em modo debug, envie as imagens para atualizar os seletores.
 */

import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const BASE_URL   = 'https://www.comprasnet.gov.br';
const LOGIN_URL  = `${BASE_URL}/seguro/loginPortalFornecedor.asp`;
const DEBUG      = process.env.DEBUG_SCREENSHOTS === 'true';
const DEBUG_DIR  = process.env.DEBUG_DIR || '/opt/licitah-worker/debug';

export interface SessaoPregao {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export interface EstadoLance {
  melhorLanceAtual: number;
  somosMelhor: boolean;
  nossoMelhorLance: number | null;
  minutosRestantes: number;
  disputaAtiva: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function screenshot(page: Page, nome: string): Promise<void> {
  if (!DEBUG) return;
  try {
    await mkdir(DEBUG_DIR, { recursive: true });
    const path = join(DEBUG_DIR, `${Date.now()}_${nome}.png`);
    await page.screenshot({ path, fullPage: true });
    console.log(`[debug] Screenshot salvo: ${path}`);
  } catch { /* ignora */ }
}

async function dumpHtml(page: Page, nome: string): Promise<void> {
  if (!DEBUG) return;
  try {
    await mkdir(DEBUG_DIR, { recursive: true });
    const html  = await page.content();
    const path  = join(DEBUG_DIR, `${Date.now()}_${nome}.html`);
    await writeFile(path, html);
    console.log(`[debug] HTML salvo: ${path}`);
  } catch { /* ignora */ }
}

export function parseMoeda(texto: string): number {
  if (!texto) return 0;
  // "R$ 1.234,56" → 1234.56
  const limpo = texto
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(limpo) || 0;
}

function parseTempo(texto: string): number {
  const match = texto.match(/(\d+):(\d+)/);
  if (!match) return 99;
  return parseInt(match[1]) + parseInt(match[2]) / 60;
}

// ── Browser ───────────────────────────────────────────────────────────────────

export async function iniciarBrowser(): Promise<SessaoPregao> {
  const browser = await chromium.launch({
    headless: !DEBUG,   // Em debug, abre janela visível
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const page = await context.newPage();
  return { browser, context, page };
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(page: Page, cpf: string, senha: string): Promise<boolean> {
  try {
    console.log(`[comprasgov] Acessando login: ${LOGIN_URL}`);
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await screenshot(page, 'login_page');
    await dumpHtml(page, 'login_page');

    const cpfDigits = cpf.replace(/\D/g, '');

    // Seletores conhecidos do ComprasNet (ASP clássico)
    // O sistema usa frames — verifica se há frameset
    const frames = page.frames();
    const targetFrame = frames.length > 1
      ? frames.find(f => f.url().includes('login') || f.url().includes('seguro')) || page.mainFrame()
      : page.mainFrame();

    // Tenta campos comuns de login ASP
    const cpfSelectors  = ['input[name="login"]', 'input[name="cpf"]', 'input[name="txtLogin"]', 'input[id="login"]', '#cpf'];
    const pwdSelectors  = ['input[name="senha"]', 'input[name="password"]', 'input[name="txtSenha"]', 'input[type="password"]'];

    let cpfInput = null;
    for (const sel of cpfSelectors) {
      const el = targetFrame.locator(sel).first();
      if (await el.isVisible().catch(() => false)) { cpfInput = el; break; }
    }

    let pwdInput = null;
    for (const sel of pwdSelectors) {
      const el = targetFrame.locator(sel).first();
      if (await el.isVisible().catch(() => false)) { pwdInput = el; break; }
    }

    if (!cpfInput || !pwdInput) {
      await screenshot(page, 'login_fields_not_found');
      await dumpHtml(page, 'login_fields_not_found');
      console.error('[comprasgov] Campos de login não encontrados. Verifique os screenshots em DEBUG_DIR.');
      return false;
    }

    await cpfInput.fill(cpfDigits);
    await pwdInput.fill(senha);
    await screenshot(page, 'login_filled');

    // Botão de submit
    const btnSelectors = [
      'input[type="submit"]',
      'button[type="submit"]',
      'input[value*="Entrar"]',
      'input[value*="Login"]',
      'input[value*="Acessar"]',
      'button:has-text("Entrar")',
    ];
    let btn = null;
    for (const sel of btnSelectors) {
      const el = targetFrame.locator(sel).first();
      if (await el.isVisible().catch(() => false)) { btn = el; break; }
    }
    if (!btn) {
      console.error('[comprasgov] Botão de submit não encontrado.');
      await screenshot(page, 'login_btn_not_found');
      return false;
    }

    await Promise.all([
      page.waitForNavigation({ timeout: 20_000 }).catch(() => {}),
      btn.click(),
    ]);

    await screenshot(page, 'after_login');
    await dumpHtml(page, 'after_login');

    const url = page.url();
    const semErro = !url.includes('loginPortal') &&
      !(await page.locator('text=Senha inválida, text=Login inválido, text=inválid').isVisible().catch(() => false));

    console.log(`[comprasgov] Login resultado: URL=${url} semErro=${semErro}`);
    return semErro;
  } catch (err) {
    console.error('[comprasgov] Erro no login:', err);
    await screenshot(page, 'login_exception').catch(() => {});
    return false;
  }
}

// ── Navegação para o pregão ───────────────────────────────────────────────────

export async function navegarParaPregao(
  page: Page,
  uasg: string,
  numeroPregao: string,
  itemNumero: string | null
): Promise<boolean> {
  try {
    // URL para acompanhar/participar de pregão como fornecedor
    // O número do pregão no ComprasNet é tipicamente "NNNNN/AAAA"
    const numLimpo = numeroPregao.replace(/\D/g, '').padStart(5, '0');
    const ano      = new Date().getFullYear();

    // Tentativas de URLs conhecidas do sistema
    const urls = [
      `${BASE_URL}/seguro/lances/lanceFornecedor.asp?prgCod=&co_uasg=${uasg}&numprp=${numLimpo}`,
      `${BASE_URL}/seguro/lances/lanceFornecedor.asp`,
      `${BASE_URL}/acesso.asp?url=/seguro/lances/lanceFornecedor.asp`,
    ];

    for (const url of urls) {
      console.log(`[comprasgov] Tentando URL: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => {});
      await screenshot(page, `nav_pregao_${url.split('/').pop()?.split('?')[0]}`);
      await dumpHtml(page, `nav_pregao`);

      // Verifica se carregou a sala de lances
      const temLance = await page.locator(
        'input[name*="lance"], input[name*="Lance"], #txtLance, .lance'
      ).isVisible().catch(() => false);

      if (temLance) {
        console.log(`[comprasgov] Sala de lances encontrada em: ${url}`);
        break;
      }
    }

    // Filtra pelo pregão específico se necessário
    await screenshot(page, 'pregao_page');
    return true;
  } catch (err) {
    console.error('[comprasgov] Erro ao navegar para pregão:', err);
    return false;
  }
}

// ── Leitura do estado da disputa ──────────────────────────────────────────────

export async function lerEstadoDisputa(page: Page): Promise<EstadoLance> {
  try {
    // Seletores para o melhor lance atual
    // O ComprasNet exibe: "Menor Lance" ou "Melhor Proposta"
    const melhorLanceTexto = await tentarLerTexto(page, [
      '#melhorLance', '#menorLance', '#bestBid',
      'td:has-text("Menor Lance") + td',
      'td:has-text("Melhor Proposta") + td',
      'span[id*="melhor"]', 'span[id*="menor"]',
      '.melhor-lance', '[id*="MelhorLance"]',
    ]);

    // Nosso último lance
    const nossoLanceTexto = await tentarLerTexto(page, [
      '#meuLance', '#ultimoLance', '#myBid',
      'td:has-text("Meu Melhor Lance") + td',
      'td:has-text("Último Lance") + td',
      'span[id*="meu"]', '[id*="MeuLance"]',
    ]);

    // Tempo restante
    const tempoTexto = await tentarLerTexto(page, [
      '#tempRestante', '#countdown', '#timer',
      'span[id*="tempo"]', 'span[id*="Tempo"]',
      '[id*="Countdown"]', '.tempo-restante',
    ]);

    // Status/situação da disputa
    const situacao = await tentarLerTexto(page, [
      '#situacao', '#status', '#statusSessao',
      'span[id*="situacao"]', '[id*="Situacao"]',
      '.situacao', 'td:has-text("Situação") + td',
    ]);

    const disputaAtiva =
      !situacao.toLowerCase().includes('encerr') &&
      !situacao.toLowerCase().includes('fechad') &&
      !situacao.toLowerCase().includes('finaliz') &&
      situacao !== '';

    const melhorLance = parseMoeda(melhorLanceTexto);
    const nossoLance  = nossoLanceTexto ? parseMoeda(nossoLanceTexto) : null;
    const minutos     = parseTempo(tempoTexto);
    const somosMelhor = nossoLance !== null && melhorLance > 0 && nossoLance <= melhorLance;

    if (DEBUG && melhorLance > 0) {
      console.log(`[debug] Estado: melhor=${melhorLance} nosso=${nossoLance} tempo=${minutos}min situacao="${situacao}"`);
    }

    return { melhorLanceAtual: melhorLance, somosMelhor, nossoMelhorLance: nossoLance, minutosRestantes: minutos, disputaAtiva };
  } catch (err) {
    console.error('[comprasgov] Erro ao ler estado:', err);
    return { melhorLanceAtual: 0, somosMelhor: false, nossoMelhorLance: null, minutosRestantes: 99, disputaAtiva: true };
  }
}

async function tentarLerTexto(page: Page, seletores: string[]): Promise<string> {
  for (const sel of seletores) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 500 })) {
        return (await el.innerText()).trim();
      }
    } catch { /* próximo */ }
  }
  return '';
}

// ── Submissão de lance ────────────────────────────────────────────────────────

// Regra do ComprasNet: mínimo 20s entre lances do mesmo fornecedor
const INTERVALO_MINIMO_MS = 21_000;
let ultimoLanceEm = 0;

export async function submeterLance(page: Page, valor: number): Promise<boolean> {
  // Respeita intervalo mínimo entre lances (regra ComprasNet)
  const agora     = Date.now();
  const decorrido = agora - ultimoLanceEm;
  if (decorrido < INTERVALO_MINIMO_MS) {
    const aguardar = INTERVALO_MINIMO_MS - decorrido;
    console.log(`[comprasgov] Aguardando ${(aguardar / 1000).toFixed(1)}s (intervalo mínimo entre lances)`);
    await new Promise(r => setTimeout(r, aguardar));
  }

  try {
    const valorStr = valor.toFixed(2).replace('.', ',');
    console.log(`[comprasgov] Submetendo lance: R$ ${valorStr}`);

    // Seletores para o campo de lance
    const inputSelectors = [
      'input[name="txtLance"]',
      'input[name="lance"]',
      'input[name="vlLance"]',
      'input[id="txtLance"]',
      'input[id="lance"]',
      'input[type="text"][name*="ance"]',
    ];

    let inputLance = null;
    for (const sel of inputSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) { inputLance = el; break; }
    }

    if (!inputLance) {
      console.error('[comprasgov] Campo de lance não encontrado');
      await screenshot(page, 'lance_field_not_found');
      await dumpHtml(page, 'lance_field_not_found');
      return false;
    }

    await inputLance.clear();
    await inputLance.fill(valorStr);
    await screenshot(page, `lance_preenchido_${valorStr}`);

    // Botão de envio do lance
    const btnSelectors = [
      'input[value*="Lance"]',
      'input[value*="Registrar"]',
      'button:has-text("Lance")',
      'button:has-text("Registrar")',
      'input[type="submit"]',
      'input[name*="btn"]',
      'input[name*="Btn"]',
    ];

    let btnLance = null;
    for (const sel of btnSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) { btnLance = el; break; }
    }

    if (!btnLance) {
      console.error('[comprasgov] Botão de lance não encontrado');
      await screenshot(page, 'lance_btn_not_found');
      return false;
    }

    await btnLance.click();
    ultimoLanceEm = Date.now();

    // Aguarda resposta do sistema
    await page.waitForTimeout(2500);
    await screenshot(page, `lance_pos_submit_${valorStr}`);

    // Verifica confirmação ou erro
    const textoErro = await tentarLerTexto(page, [
      '#msgErro', '#erro', '.erro', '.error',
      'span[id*="erro"]', 'span[id*="Erro"]',
    ]);

    if (textoErro && textoErro.toLowerCase().includes('erro')) {
      console.warn(`[comprasgov] Lance rejeitado: ${textoErro}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[comprasgov] Erro ao submeter lance:', err);
    await screenshot(page, 'lance_exception').catch(() => {});
    return false;
  }
}
