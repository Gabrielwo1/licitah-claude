/**
 * Automação Playwright — Compras.gov (ComprasNet / SIASG)
 *
 * IMPORTANTE: Os seletores CSS marcados com TODO precisam ser
 * validados abrindo o Compras.gov manualmente e inspecionando
 * os elementos na fase de disputa do pregão.
 */

import { Browser, BrowserContext, Page, chromium } from 'playwright';

const COMPRAS_GOV_URL  = 'https://www.comprasnet.gov.br';
const LOGIN_URL        = `${COMPRAS_GOV_URL}/seguro/loginPortal.asp`;
const PREGAO_BASE_URL  = `${COMPRAS_GOV_URL}/livre/fornecedor/lances`;

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

/**
 * Inicia o browser Playwright em modo headless.
 */
export async function iniciarBrowser(): Promise<SessaoPregao> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'pt-BR',
  });
  const page = await context.newPage();
  return { browser, context, page };
}

/**
 * Login no Compras.gov usando CPF + senha.
 * TODO: Validar fluxo real — o portal pode usar gov.br SSO.
 */
export async function login(page: Page, cpf: string, senha: string): Promise<boolean> {
  try {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30_000 });

    // TODO: Ajustar seletores após inspecionar a página de login
    const cpfInput   = page.locator('input[name="textlogin"], input[id="cpf"], input[type="text"]').first();
    const senhaInput = page.locator('input[name="textSenha"], input[id="senha"], input[type="password"]').first();
    const btnLogin   = page.locator('input[type="submit"], button[type="submit"]').first();

    await cpfInput.fill(cpf.replace(/\D/g, ''));
    await senhaInput.fill(senha);
    await btnLogin.click();

    // Aguarda redirecionamento pós-login
    await page.waitForNavigation({ timeout: 15_000 }).catch(() => {});

    // Verifica se login foi bem-sucedido (ausência de mensagem de erro)
    const url = page.url();
    const erroVisible = await page.locator('text=Senha inválida, text=Login inválido, text=Usuário não encontrado').isVisible().catch(() => false);

    return !erroVisible && !url.includes('loginPortal');
  } catch (err) {
    console.error('[comprasgov] Erro no login:', err);
    return false;
  }
}

/**
 * Navega até a sala de disputa do pregão especificado.
 * TODO: Validar URL e seletores reais após acesso ao portal.
 */
export async function navegarParaPregao(
  page: Page,
  uasg: string,
  numeroPregao: string,
  itemNumero: string | null
): Promise<boolean> {
  try {
    // URL de disputa — formato real precisa ser confirmado no portal
    // TODO: Confirmar URL de disputa do pregão eletrônico
    const url = `${PREGAO_BASE_URL}?uasg=${uasg}&numprp=${numeroPregao.replace(/\D/g, '')}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

    // TODO: Selecionar o item correto se houver múltiplos itens
    if (itemNumero) {
      const itemLink = page.locator(`text=${itemNumero}`).first();
      if (await itemLink.isVisible()) await itemLink.click();
    }

    // Aguarda carregamento da sala de lances
    // TODO: Ajustar seletor que indica que a sala carregou
    await page.waitForSelector('.lance, #melhorLance, [id*="lance"]', { timeout: 20_000 }).catch(() => {});

    return true;
  } catch (err) {
    console.error('[comprasgov] Erro ao navegar para pregão:', err);
    return false;
  }
}

/**
 * Lê o estado atual da disputa na página.
 * TODO: Todos os seletores precisam ser validados na página real.
 */
export async function lerEstadoDisputa(page: Page): Promise<EstadoLance> {
  try {
    // TODO: Ajustar seletores após inspecionar a página de disputa ao vivo
    const melhorLanceTexto = await page.locator(
      '#melhorLance, .melhor-lance, [id*="MelhorLance"], [class*="melhorLance"]'
    ).first().innerText().catch(() => '0');

    const nossoLanceTexto = await page.locator(
      '#nossoLance, .nosso-lance, [id*="NossoLance"]'
    ).first().innerText().catch(() => '');

    const tempoTexto = await page.locator(
      '#tempRestante, .tempo-restante, [id*="Tempo"], [class*="tempo"]'
    ).first().innerText().catch(() => '99:00');

    const situacao = await page.locator(
      '#situacao, .situacao-disputa, [id*="Situacao"]'
    ).first().innerText().catch(() => '');

    const disputaAtiva = !situacao.toLowerCase().includes('encerr') &&
                         !situacao.toLowerCase().includes('fechad');

    const melhorLance = parseMoeda(melhorLanceTexto);
    const nossoLance  = nossoLanceTexto ? parseMoeda(nossoLanceTexto) : null;
    const minutos     = parseTempo(tempoTexto);

    const somosMelhor = nossoLance !== null && nossoLance <= melhorLance;

    return { melhorLanceAtual: melhorLance, somosMelhor, nossoMelhorLance: nossoLance, minutosRestantes: minutos, disputaAtiva };
  } catch (err) {
    console.error('[comprasgov] Erro ao ler estado:', err);
    return { melhorLanceAtual: 0, somosMelhor: false, nossoMelhorLance: null, minutosRestantes: 0, disputaAtiva: false };
  }
}

/**
 * Submete um lance no formulário da disputa.
 * TODO: Seletores precisam ser validados na página real.
 */
export async function submeterLance(page: Page, valor: number): Promise<boolean> {
  try {
    const valorStr = valor.toFixed(2).replace('.', ',');

    // TODO: Ajustar seletor do campo de lance e botão de confirmação
    const inputLance = page.locator(
      'input[name*="lance"], input[id*="lance"], input[id*="Lance"]'
    ).first();
    const btnSubmit = page.locator(
      'button:has-text("Registrar"), input[value*="Lance"], button[id*="lance"]'
    ).first();

    await inputLance.clear();
    await inputLance.fill(valorStr);

    // Aguarda confirmação antes de submeter (evita clique acidental)
    await page.waitForTimeout(500);
    await btnSubmit.click();

    // Aguarda confirmação visual do sistema
    await page.waitForTimeout(2000);

    // TODO: Verificar se o lance foi aceito (ex: mensagem de sucesso)
    const aceito = await page.locator(
      'text=Lance registrado, text=Sucesso, .lance-aceito'
    ).isVisible().catch(() => false);

    return aceito;
  } catch (err) {
    console.error('[comprasgov] Erro ao submeter lance:', err);
    return false;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseMoeda(texto: string): number {
  if (!texto) return 0;
  const limpo = texto.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(limpo) || 0;
}

function parseTempo(texto: string): number {
  // Formato "MM:SS" → retorna minutos
  const match = texto.match(/(\d+):(\d+)/);
  if (!match) return 99;
  return parseInt(match[1]) + parseInt(match[2]) / 60;
}
