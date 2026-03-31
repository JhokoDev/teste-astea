import { test, expect } from '@playwright/test';

test.describe('Fluxo de Submissão de Projetos', () => {
  test.beforeEach(async ({ page }) => {
    // Simula login como estudante
    await page.goto('/');
    await page.evaluate(() => {
      const mockUser = {
        id: 'test-student-id',
        uid: 'test-student-id',
        email: 'student@test.com',
        role: 'student',
        full_name: 'Estudante Teste'
      };
      localStorage.setItem('dev_user', JSON.stringify(mockUser));
      localStorage.setItem('simulated_role', 'student');
    });
    await page.reload();
  });

  test('deve submeter um novo projeto com sucesso', async ({ page }) => {
    // Navega para a aba de Projetos
    await page.click('button:has-text("Projetos")');
    
    // Inicia submissão
    await page.click('button:has-text("Submeter Projeto")');
    
    // Seleciona a feira (tenta selecionar a primeira disponível)
    const select = page.locator('select:has-text("Selecione a feira")');
    await expect(select).toBeVisible();
    
    // Se não houver feiras abertas, o teste vai falhar aqui com uma mensagem clara
    const options = await select.locator('option').count();
    if (options <= 1) {
      throw new Error('Não há feiras abertas para submissão de projetos. Crie uma feira publicada primeiro.');
    }
    
    await select.selectOption({ index: 1 });
    
    // Preenche dados do projeto
    await page.fill('input[placeholder="Título do Projeto"]', 'Projeto de Teste Automatizado');
    await page.fill('textarea[placeholder="Resumo do projeto..."]', 'Um resumo detalhado para o projeto de teste E2E.');
    
    // Seleciona categoria e modalidade (se houver opções)
    // await page.selectOption('select:has-text("Categoria")', { index: 1 });
    // await page.selectOption('select:has-text("Modalidade")', { index: 1 });
    
    // Adiciona orientador
    await page.fill('input[placeholder="email@orientador.com"]', 'orientador@test.com');
    
    // Finaliza submissão
    await page.click('button:has-text("Finalizar Submissão")');
    
    // Verifica se voltou para a lista e se o projeto aparece
    await expect(page.locator('h2:has-text("Meus Projetos")')).toBeVisible();
    await expect(page.locator('text=Projeto de Teste Automatizado')).toBeVisible();
  });
});
