/**
 * Automação Playwright — Compras.gov (novo SPA React)
 *
 * Sistema atual: cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/
 * Login: Gov.br SSO (acesso.gov.br) com CPF + senha
 *
 * MODO DEBUG: defina DEBUG_SCREENSHOTS=true nas env vars para salvar
 * screenshots e HTML de cada etapa em /opt/licitah-worker/debug/
 *
 * MODO TREINAMENTO: defina COMPRASGOV_ENV=treinamento para usar o
 * ambiente de treinamento em vez do produção.
 */

import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const IS_TREINAMENTO = process.env.COMPRASGOV_ENV === 'treinamento';

const BASE_URL = IS_TREINAMENTO
  ? 'https://treinamento.comprasnet.gov.br'
  : 'https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web';

const GOVBR_URL = 'https://acesso.gov.br';

const DEBUG     = process.env.DEBUG_SCREENSHOTS === 'true';
const DEBUG_DIR = process.env.DEBUG_DIR || '/opt/licitah-worker/debug';

// Modality code 05 = Pregão Eletrônico in ComprasNet
const MODALIDADE_PREGAO = '05';

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
    console.log(`[debug] Screenshot: ${path}`);
  } catch { /* ignora */ }
}

async function dumpHtml(page: Page, nome: string): Promise<void> {
  if (!DEBUG) return;
  try {
    await mkdir(DEBUG_DIR, { recursive: true });
    const html = await page.content();
    const path = join(DEBUG_DIR, `${Date.now()}_${nome}.html`);
    await writeFile(path, html);
    console.log(`[debug] HTML: ${path}`);
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
  // "02:30" → 2.5 minutes
  const match = texto.match(/(\d+):(\d+)/);
  if (!match) return 99;
  return parseInt(match[1]) + parseInt(match[2]) / 60;
}

/**
 * Monta o parâmetro `compra` usado na URL de disputa.
 * Formato: <UASG (6)><MODALIDADE (2)><NUM_PREGAO (5)><ANO (4)>
 * Exemplo: 383518 + 05 + 00010 + 2020 = "38351805000102020"
 *
 * O numeroPregao pode vir como "10", "00010", "00010/2020" ou "10/2020".
 */
export function montarCompraId(uasg: string, numeroPregao: string): string {
  // Extrai ano e número do pregão
  let ano  = String(new Date().getFullYear());
  let num  = numeroPregao;

  const comAno = numeroPregao.match(/^(\d+)\/(\d{4})$/);
  if (comAno) {
    num = comAno[1];
    ano = comAno[2];
  }

  const numPadded = num.replace(/\D/g, '').padStart(5, '0');
  const uasgLimpa = uasg.replace(/\D/g, '');

  return `${uasgLimpa}${MODALIDADE_PREGAO}${numPadded}${ano}`;
}

// ── Browser ───────────────────────────────────────────────────────────────────

export async function iniciarBrowser(): Promise<SessaoPregao> {
  const browser = await chromium.launch({
    // Roda com interface visível para evitar detecção de hCaptcha.
    // Em modo CI (testes), usa headless mesmo assim.
    headless: process.env.CI === 'true' ? true : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport:   { width: 1366, height: 768 },
    locale:     'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });

  const page = await context.newPage();
  return { browser, context, page };
}

// ── Login via Gov.br SSO ──────────────────────────────────────────────────────

/**
 * Faz login no Compras.gov via Gov.br SSO (fluxo OIDC padrão):
 * 1. Acessa o SPA e clica em "Entrar com Gov.br"
 * 2. Digita CPF em acesso.gov.br
 * 3. Digita senha
 * 4. Aguarda redirecionamento de volta para o SPA
 */
export async function login(page: Page, cpf: string, senha: string): Promise<boolean> {
  try {
    const cpfDigits = cpf.replace(/\D/g, '');
    console.log(`[comprasgov] Iniciando login Gov.br (CPF: ${cpfDigits.slice(0, 3)}...)`);

    // ── Passo 1: Abre o SPA e clica em "Entrar" ─────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 45_000 });
    await screenshot(page, '01_spa_home');
    await dumpHtml(page, '01_spa_home');

    // O botão de login no SPA varia — tenta as alternativas mais comuns
    const loginBtnSelectors = [
      'button:has-text("Entrar com Gov.br")',
      'a:has-text("Entrar com Gov.br")',
      'button:has-text("Entrar")',
      'a:has-text("Entrar")',
      '[data-testid="login-btn"]',
      '.btn-login',
    ];

    let clicouLogin = false;
    for (const sel of loginBtnSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await el.click();
        clicouLogin = true;
        console.log(`[comprasgov] Botão de login clicado: "${sel}"`);
        break;
      }
    }

    if (!clicouLogin) {
      // Pode ser que o SPA já redirecione direto para Gov.br — tenta navegar
      const govbrLoginUrl = `${GOVBR_URL}/login?service=portal_compras`;
      console.log(`[comprasgov] Botão não encontrado, navegando direto para Gov.br`);
      await page.goto(govbrLoginUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    }

    // Aguarda redirecionamento para acesso.gov.br
    await page.waitForURL(/acesso\.gov\.br/, { timeout: 20_000 }).catch(async () => {
      // Se não redirecionou, pode estar em outra URL de login
      await screenshot(page, '01b_login_redirect_fail');
      console.warn('[comprasgov] Não redirecionou para acesso.gov.br — tentando prosseguir');
    });

    await screenshot(page, '02_govbr_page');
    await dumpHtml(page, '02_govbr_page');

    // ── Passo 2: CPF em acesso.gov.br ────────────────────────────────────────
    const cpfSelectors = [
      'input[name="accountName"]',
      'input[id="accountName"]',
      'input[type="text"][name*="cpf"]',
      'input[id="cpf"]',
      'input[placeholder*="CPF"]',
      'input[type="text"]',
    ];

    let cpfInput = null;
    for (const sel of cpfSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 3_000 }).catch(() => false)) {
        cpfInput = el;
        break;
      }
    }

    if (!cpfInput) {
      await screenshot(page, '02b_cpf_field_not_found');
      await dumpHtml(page, '02b_cpf_field_not_found');
      console.error('[comprasgov] Campo CPF não encontrado em acesso.gov.br');
      return false;
    }

    await cpfInput.fill(cpfDigits);
    await screenshot(page, '03_cpf_filled');

    // Botão "Continuar" ou "Próximo" após CPF
    const continuarSelectors = [
      'button:has-text("Continuar")',
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Avançar")',
      'button:has-text("Próximo")',
    ];

    let btnContinuar = null;
    for (const sel of continuarSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2_000 }).catch(() => false)) {
        btnContinuar = el;
        break;
      }
    }

    if (!btnContinuar) {
      console.error('[comprasgov] Botão continuar não encontrado após CPF');
      await screenshot(page, '03b_continuar_not_found');
      return false;
    }

    await btnContinuar.click();
    await page.waitForTimeout(2_000);
    await screenshot(page, '04_after_cpf');

    // ── Passo 3: Senha ────────────────────────────────────────────────────────
    const senhaSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]',
      'input[name="senha"]',
    ];

    let senhaInput = null;
    for (const sel of senhaSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 5_000 }).catch(() => false)) {
        senhaInput = el;
        break;
      }
    }

    if (!senhaInput) {
      await screenshot(page, '04b_senha_not_found');
      await dumpHtml(page, '04b_senha_not_found');
      console.error('[comprasgov] Campo senha não encontrado. Pode haver CAPTCHA ou outro passo.');
      return false;
    }

    await senhaInput.fill(senha);
    await screenshot(page, '05_senha_filled');

    // Botão "Entrar" / "Login" após senha
    const entrarSelectors = [
      'button:has-text("Entrar")',
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Continuar")',
    ];

    let btnEntrar = null;
    for (const sel of entrarSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2_000 }).catch(() => false)) {
        btnEntrar = el;
        break;
      }
    }

    if (!btnEntrar) {
      console.error('[comprasgov] Botão entrar não encontrado após senha');
      await screenshot(page, '05b_entrar_not_found');
      return false;
    }

    await Promise.all([
      page.waitForNavigation({ timeout: 30_000 }).catch(() => {}),
      btnEntrar.click(),
    ]);

    await screenshot(page, '06_after_login');
    await dumpHtml(page, '06_after_login');

    // ── Passo 4: Verifica se voltou ao SPA autenticado ───────────────────────
    const urlFinal = page.url();
    console.log(`[comprasgov] URL após login: ${urlFinal}`);

    // Indicadores de falha
    const paginaErro = await page.locator(
      'text=Senha inválida, text=CPF não encontrado, text=Acesso negado, text=inválid, text=incorret'
    ).isVisible().catch(() => false);

    if (paginaErro) {
      await screenshot(page, '06b_login_erro');
      console.error('[comprasgov] Login recusado — credenciais inválidas ou CAPTCHA pendente.');
      return false;
    }

    // Aguarda SPA hidratação se voltou ao comprasnet
    if (urlFinal.includes('estaleiro.serpro') || urlFinal.includes('comprasnet')) {
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      await screenshot(page, '07_spa_autenticado');
    }

    console.log('[comprasgov] Login bem-sucedido.');
    return true;

  } catch (err) {
    console.error('[comprasgov] Erro no login:', err);
    await screenshot(page, 'login_exception').catch(() => {});
    return false;
  }
}

// ── Navegação para a sala de disputa ─────────────────────────────────────────

/**
 * Navega para a sala de disputa do pregão.
 * URL: /comprasnet-web/seguro/fornecedor/disputa?compra=<COMPRA_ID>
 */
export async function navegarParaPregao(
  page: Page,
  uasg: string,
  numeroPregao: string,
  _itemNumero: string | null
): Promise<boolean> {
  try {
    const compraId = montarCompraId(uasg, numeroPregao);
    const url = `${BASE_URL}/seguro/fornecedor/disputa?compra=${compraId}`;

    console.log(`[comprasgov] Navegando para disputa: ${url}`);
    console.log(`[comprasgov] compra ID: ${compraId}`);

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await screenshot(page, 'disputa_carregando');
    await dumpHtml(page, 'disputa_carregando');

    // Aguarda SPA renderizar o conteúdo da sala de disputa
    // Indica que carregou: botão "Enviar Lance" ou campo de valor, ou seção de lances
    const elementosDisputa = [
      'button:has-text("Enviar Lance")',
      'button:has-text("Registrar Lance")',
      'input[placeholder*="lance"]',
      'input[placeholder*="Lance"]',
      'input[placeholder*="valor"]',
      '[class*="disputa"]',
      '[class*="lance"]',
      'text=Melhor lance',
    ];

    let encontrou = false;
    for (const sel of elementosDisputa) {
      const visivel = await page.locator(sel).first().isVisible({ timeout: 5_000 }).catch(() => false);
      if (visivel) {
        console.log(`[comprasgov] Sala de disputa detectada via: "${sel}"`);
        encontrou = true;
        break;
      }
    }

    if (!encontrou) {
      // Pode ter pedido seleção de item ou outra interação
      await screenshot(page, 'disputa_sem_elementos');
      await dumpHtml(page, 'disputa_sem_elementos');
      console.warn('[comprasgov] Elementos de disputa não encontrados — verifique o screenshot');
    }

    await screenshot(page, 'disputa_pronta');
    return true;

  } catch (err) {
    console.error('[comprasgov] Erro ao navegar para pregão:', err);
    await screenshot(page, 'nav_exception').catch(() => {});
    return false;
  }
}

// ── Leitura do estado da disputa ──────────────────────────────────────────────

export async function lerEstadoDisputa(page: Page): Promise<EstadoLance> {
  try {
    // No SPA React, os valores ficam em elementos de texto próximos a labels.
    // Os seletores abaixo cobrem o padrão <label>...<span/div com valor>.

    const melhorLanceTexto = await tentarLerTexto(page, [
      // Seletores SPA (React, sem IDs fixos — baseados em texto próximo)
      '[class*="melhor"] [class*="valor"]',
      '[class*="melhor"] span',
      '[class*="melhorLance"]',
      '[class*="best-bid"]',
      // Padrão: elemento irmão após label de texto
      'text=Melhor lance >> xpath=../following-sibling::*[1]',
      'text=Melhor Lance >> xpath=../following-sibling::*[1]',
      ':text("Melhor lance") + *',
      ':text("Menor lance") + *',
    ]);

    const nossoLanceTexto = await tentarLerTexto(page, [
      '[class*="meuLance"]',
      '[class*="meu-lance"]',
      '[class*="myBid"]',
      'text=Meu último lance >> xpath=../following-sibling::*[1]',
      'text=Meu Melhor Lance >> xpath=../following-sibling::*[1]',
      ':text("Meu último lance") + *',
      ':text("Meu Melhor Lance") + *',
    ]);

    const tempoTexto = await tentarLerTexto(page, [
      '[class*="countdown"]',
      '[class*="timer"]',
      '[class*="tempo"]',
      ':text("Tempo") + *',
      ':text("Restante") + *',
    ]);

    const situacaoTexto = await tentarLerTexto(page, [
      '[class*="situacao"]',
      '[class*="status"]',
      '[class*="fase"]',
      ':text("Situação") + *',
      ':text("Fase") + *',
      ':text("Status") + *',
    ]);

    const melhorLance = parseMoeda(melhorLanceTexto);
    const nossoLance  = nossoLanceTexto ? parseMoeda(nossoLanceTexto) : null;
    const minutos     = parseTempo(tempoTexto);

    const disputaAtiva =
      !situacaoTexto.toLowerCase().includes('encerr') &&
      !situacaoTexto.toLowerCase().includes('fechad') &&
      !situacaoTexto.toLowerCase().includes('finaliz') &&
      !situacaoTexto.toLowerCase().includes('suspen');

    const somosMelhor = nossoLance !== null && melhorLance > 0 && nossoLance <= melhorLance;

    if (DEBUG) {
      console.log(`[debug] melhor="${melhorLanceTexto}" nosso="${nossoLanceTexto}" tempo="${tempoTexto}" situacao="${situacaoTexto}"`);
    }

    return {
      melhorLanceAtual:  melhorLance,
      somosMelhor,
      nossoMelhorLance:  nossoLance,
      minutosRestantes:  minutos,
      disputaAtiva,
    };

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

// ComprasNet: mínimo 20s entre lances do mesmo fornecedor (IN 03/13)
const INTERVALO_MINIMO_MS = 21_000;
let ultimoLanceEm = 0;

export async function submeterLance(page: Page, valor: number): Promise<boolean> {
  const agora     = Date.now();
  const decorrido = agora - ultimoLanceEm;
  if (decorrido < INTERVALO_MINIMO_MS) {
    const aguardar = INTERVALO_MINIMO_MS - decorrido;
    console.log(`[comprasgov] Aguardando ${(aguardar / 1000).toFixed(1)}s (intervalo mínimo)`);
    await new Promise(r => setTimeout(r, aguardar));
  }

  try {
    const valorStr = valor.toFixed(2).replace('.', ',');
    console.log(`[comprasgov] Submetendo lance: R$ ${valorStr}`);

    // ── Campo de valor do lance ───────────────────────────────────────────────
    // No SPA React, o campo de input pode ter placeholder indicativo
    const inputSelectors = [
      'input[placeholder*="lance"]',
      'input[placeholder*="Lance"]',
      'input[placeholder*="valor"]',
      'input[placeholder*="Valor"]',
      'input[type="number"]',
      'input[type="text"][class*="lance"]',
      'input[name*="lance"]',
      'input[name*="Lance"]',
      // Fallback: input dentro de um formulário/seção de lance
      '[class*="lance"] input',
      '[class*="bid"] input',
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

    await inputLance.click();
    await inputLance.selectText().catch(() => {});
    await inputLance.fill(valorStr);
    await screenshot(page, `lance_preenchido_${valorStr.replace(',', '_')}`);

    // ── Botão "Enviar Lance" ──────────────────────────────────────────────────
    const btnSelectors = [
      'button:has-text("Enviar Lance")',
      'button:has-text("Registrar Lance")',
      'button:has-text("Enviar")',
      'button:has-text("Registrar")',
      'button[type="submit"]',
      'input[type="submit"]',
    ];

    let btnLance = null;
    for (const sel of btnSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) { btnLance = el; break; }
    }

    if (!btnLance) {
      console.error('[comprasgov] Botão de lance não encontrado');
      await screenshot(page, 'lance_btn_not_found');
      await dumpHtml(page, 'lance_btn_not_found');
      return false;
    }

    await btnLance.click();
    ultimoLanceEm = Date.now();

    // Aguarda resposta do SPA (animação / toast de confirmação)
    await page.waitForTimeout(3_000);
    await screenshot(page, `lance_pos_submit_${valorStr.replace(',', '_')}`);

    // Verifica se apareceu diálogo de confirmação (alguns sistemas pedem "Confirmar?")
    const btnConfirmar = page.locator('button:has-text("Confirmar"), button:has-text("Sim"), button:has-text("OK")').first();
    if (await btnConfirmar.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await btnConfirmar.click();
      await page.waitForTimeout(2_000);
      await screenshot(page, `lance_confirmado_${valorStr.replace(',', '_')}`);
    }

    // Detecta mensagem de erro
    const mensagemErro = await tentarLerTexto(page, [
      '[class*="erro"]', '[class*="error"]', '[class*="alert"]',
      '.toast-error', '[role="alert"]',
      'text=não permitido', 'text=inválido', 'text=abaixo do mínimo',
    ]);

    if (mensagemErro && (
      mensagemErro.toLowerCase().includes('erro') ||
      mensagemErro.toLowerCase().includes('inváli') ||
      mensagemErro.toLowerCase().includes('não permit')
    )) {
      console.warn(`[comprasgov] Lance rejeitado: "${mensagemErro}"`);
      return false;
    }

    console.log(`[comprasgov] Lance R$ ${valorStr} enviado com sucesso.`);
    return true;

  } catch (err) {
    console.error('[comprasgov] Erro ao submeter lance:', err);
    await screenshot(page, 'lance_exception').catch(() => {});
    return false;
  }
}
