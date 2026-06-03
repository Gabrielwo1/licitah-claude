/**
 * Diagnóstico de seletores — roda UMA vez para confirmar que o
 * Playwright consegue fazer login e navegar no Compras.gov.
 *
 * Uso:
 *   DEBUG_SCREENSHOTS=true CPF=seu_cpf SENHA=sua_senha tsx src/diagnostico.ts
 *
 * Abre o browser VISÍVEL e salva screenshots em /opt/licitah-worker/debug/
 * Envie os screenshots para validarmos os seletores.
 */

import 'dotenv/config';
import { iniciarBrowser, login, navegarParaPregao, lerEstadoDisputa } from './comprasgov';

process.env.DEBUG_SCREENSHOTS = 'true';

async function main() {
  const cpf   = process.env.CPF   || '';
  const senha = process.env.SENHA || '';
  const uasg  = process.env.UASG  || '';
  const prp   = process.env.PREGAO || '';

  if (!cpf || !senha) {
    console.error('Defina CPF e SENHA nas variáveis de ambiente.');
    console.error('Exemplo: CPF=12345678900 SENHA=suasenha tsx src/diagnostico.ts');
    process.exit(1);
  }

  console.log('=== DIAGNÓSTICO DE SELETORES ===');
  console.log('Screenshots serão salvos em: /opt/licitah-worker/debug/\n');

  const { browser, page } = await iniciarBrowser();

  try {
    // Passo 1: Login
    console.log('[1] Testando login...');
    const logou = await login(page, cpf, senha);
    console.log(logou ? '  ✅ Login OK' : '  ❌ Login FALHOU — veja screenshot login_fields_not_found');

    if (!logou) {
      console.log('\nVerifique os screenshots e atualize os seletores em comprasgov.ts');
      return;
    }

    // Passo 2: Navegação (opcional)
    if (uasg && prp) {
      console.log(`[2] Testando navegação para UASG=${uasg} Pregão=${prp}...`);
      const navegou = await navegarParaPregao(page, uasg, prp, null);
      console.log(navegou ? '  ✅ Navegação OK' : '  ❌ Navegação FALHOU');

      // Passo 3: Leitura de estado
      console.log('[3] Lendo estado da disputa...');
      const estado = await lerEstadoDisputa(page);
      console.log('  Estado:', JSON.stringify(estado, null, 2));

      if (estado.melhorLanceAtual === 0) {
        console.log('  ⚠️  Melhor lance = 0. Verifique os seletores de leitura em comprasgov.ts');
        console.log('  Veja os screenshots para identificar os IDs corretos dos elementos');
      }
    } else {
      console.log('[2] Pulando navegação (UASG e PREGAO não definidos)');
      console.log('    Para testar navegação: UASG=123456 PREGAO=00001/2024 tsx src/diagnostico.ts');
    }

    console.log('\n=== DIAGNÓSTICO CONCLUÍDO ===');
    console.log('Arquivos gerados em: /opt/licitah-worker/debug/');
    console.log('Compartilhe os screenshots e HTMLs para validação dos seletores.\n');

    // Mantém o browser aberto 30s para inspeção manual (modo debug)
    if (!process.env.CI) {
      console.log('Browser ficará aberto por 30s para inspeção manual...');
      await new Promise(r => setTimeout(r, 30_000));
    }

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
