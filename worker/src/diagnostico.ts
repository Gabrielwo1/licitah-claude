/**
 * Diagnóstico de seletores — roda UMA vez para confirmar que o
 * Playwright consegue fazer login e navegar no Compras.gov.
 *
 * Uso:
 *   CPF=seu_cpf SENHA=sua_senha tsx src/diagnostico.ts
 *
 * Para usar o ambiente de treinamento (sem riscos reais):
 *   COMPRASGOV_ENV=treinamento CPF=seu_cpf SENHA=sua_senha tsx src/diagnostico.ts
 *
 * Para testar navegação completa:
 *   CPF=xxx SENHA=yyy UASG=123456 PREGAO=00010/2024 tsx src/diagnostico.ts
 *
 * Abre o browser VISÍVEL e salva screenshots em /opt/licitah-worker/debug/
 */

import 'dotenv/config';
import { iniciarBrowser, login, navegarParaPregao, lerEstadoDisputa, montarCompraId } from './comprasgov';

process.env.DEBUG_SCREENSHOTS = 'true';

async function main() {
  const cpf    = process.env.CPF     || '';
  const senha  = process.env.SENHA   || '';
  const uasg   = process.env.UASG    || '';
  const pregao = process.env.PREGAO  || '';
  const env    = process.env.COMPRASGOV_ENV || 'producao';

  if (!cpf || !senha) {
    console.error('Defina CPF e SENHA nas variáveis de ambiente.');
    console.error('Exemplo: CPF=12345678900 SENHA=suasenha tsx src/diagnostico.ts');
    process.exit(1);
  }

  console.log('=== DIAGNÓSTICO COMPRAS.GOV ===');
  console.log(`Ambiente: ${env.toUpperCase()}`);
  console.log('Screenshots serão salvos em: /opt/licitah-worker/debug/\n');

  if (uasg && pregao) {
    const compraId = montarCompraId(uasg, pregao);
    console.log(`compra ID que será usado: ${compraId}`);
    console.log(`URL de disputa: https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/seguro/fornecedor/disputa?compra=${compraId}\n`);
  }

  const { browser, page } = await iniciarBrowser();

  try {
    // Passo 1: Login Gov.br
    console.log('[1] Testando login Gov.br...');
    const logou = await login(page, cpf, senha);
    console.log(logou ? '  ✅ Login OK' : '  ❌ Login FALHOU — veja screenshots em debug/');

    if (!logou) {
      console.log('\nVerifique os screenshots em /opt/licitah-worker/debug/');
      console.log('Passos provável do problema:');
      console.log('  - 02_govbr_page: como está a página de login do Gov.br?');
      console.log('  - 02b_cpf_field_not_found: campo CPF não encontrado?');
      console.log('  - 04b_senha_not_found: campo senha não encontrado (CAPTCHA?)');
      console.log('  - 06b_login_erro: credenciais inválidas?');
      return;
    }

    // Passo 2: Navegação (requer UASG e PREGAO)
    if (uasg && pregao) {
      console.log(`\n[2] Testando navegação: UASG=${uasg} Pregão=${pregao}...`);
      const navegou = await navegarParaPregao(page, uasg, pregao, null);
      console.log(navegou ? '  ✅ Navegação OK' : '  ❌ Navegação FALHOU');

      // Passo 3: Leitura de estado
      console.log('\n[3] Lendo estado da disputa...');
      const estado = await lerEstadoDisputa(page);
      console.log('  Estado:', JSON.stringify(estado, null, 2));

      if (estado.melhorLanceAtual === 0) {
        console.log('\n  ⚠️  Melhor lance = 0. Possíveis causas:');
        console.log('     - Pregão não está em fase de disputa');
        console.log('     - Seletores precisam ser ajustados');
        console.log('     - Verifique os screenshots para identificar os elementos');
      }

      if (!estado.disputaAtiva) {
        console.log('  ⚠️  Disputa não ativa (encerrada/suspensa)');
      }

    } else {
      console.log('\n[2] Pulando navegação (UASG e PREGAO não definidos)');
      console.log('    Para testar navegação completa:');
      console.log('    UASG=123456 PREGAO=00010/2024 tsx src/diagnostico.ts');
    }

    console.log('\n=== DIAGNÓSTICO CONCLUÍDO ===');
    console.log('Arquivos gerados em: /opt/licitah-worker/debug/');
    console.log('Compartilhe os screenshots para validação dos seletores.\n');

    // Mantém o browser aberto para inspeção manual (exceto CI)
    if (!process.env.CI) {
      console.log('Browser ficará aberto por 60s para inspeção manual...');
      console.log('Pressione Ctrl+C para fechar antes.');
      await new Promise(r => setTimeout(r, 60_000));
    }

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
