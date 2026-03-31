import { test, expect } from '@playwright/test';

test.describe('Fluxo de Submissão de Projetos', () => {
  test.beforeEach(async ({ page }) => {
    // Captura logs do console do navegador
    page.on('console', msg => {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });

    // Simula login como estudante
    await page.goto('/');
    await page.evaluate(() => {
      const mockUser = {
        id: '00000000-0000-0000-0000-000000000002',
        uid: '00000000-0000-0000-0000-000000000002',
        email: 'student@test.com',
        role: 'student',
        full_name: 'Estudante Teste'
      };
      localStorage.setItem('dev_user', JSON.stringify(mockUser));
      localStorage.setItem('simulated_role', 'student');
    });
    await page.reload();
    
    // Espera o carregamento inicial sumir
    await page.waitForSelector('.animate-spin', { state: 'hidden' });
    
    // Esconde o FAB que pode interceptar cliques
    await page.addStyleTag({ content: '.fixed.bottom-6 { display: none !important; }' });
  });

  test('deve submeter um novo projeto com sucesso', async ({ page }) => {
    // Navega para a aba de Projetos
    await page.click('button:has-text("Projetos")');
    
    // Espera carregar a lista de projetos
    await page.waitForSelector('h2:has-text("Projetos Submetidos")');
    await page.waitForSelector('.animate-spin', { state: 'hidden' });
    
    // Inicia submissão
    await page.click('button:has-text("Submeter Projeto")');
    
    // Espera o formulário de submissão aparecer
    await page.waitForSelector('h2:has-text("Submeter Novo Projeto")', { timeout: 10000 });
    
    // Seleciona a feira (tenta selecionar a primeira disponível)
    const select = page.locator('select').first();
    await expect(select).toBeVisible({ timeout: 10000 });
    
    // Se não houver feiras abertas, o teste vai falhar aqui com uma mensagem clara
    const options = await select.locator('option').count();
    if (options <= 1) {
      throw new Error('Não há feiras abertas para submissão de projetos. Crie uma feira publicada primeiro.');
    }
    
    await select.selectOption({ index: 1 });
    
    // Preenche dados do projeto
    await page.fill('input[placeholder*="Sistema de Purificação"]', 'Projeto de Teste Automatizado');
    await page.fill('textarea[placeholder*="Descreva seu projeto"]', 'Um resumo detalhado para o projeto de teste E2E.');
    
    // Seleciona categoria e modalidade (se houver opções)
    // await page.selectOption('select:has-text("Categoria")', { index: 1 });
    // await page.selectOption('select:has-text("Modalidade")', { index: 1 });
    
    // Adiciona orientador
    await page.fill('input[placeholder*="orientador@exemplo.com"]', 'orientador@test.com');
    
    // Finaliza submissão
    await page.click('button[type="submit"]:has-text("Submeter Projeto")');
    
    // Verifica se voltou para a lista e se o projeto aparece
    await expect(page.locator('h2:has-text("Projetos Submetidos")')).toBeVisible();
    await expect(page.locator('text=Projeto de Teste Automatizado')).toBeVisible();
  });
});
