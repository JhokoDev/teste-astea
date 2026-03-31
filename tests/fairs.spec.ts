import { test, expect } from '@playwright/test';

test.describe('Fluxo de Criação de Feiras', () => {
  test.beforeEach(async ({ page }) => {
    // Simula login como admin
    await page.goto('/');
    await page.evaluate(() => {
      const mockUser = {
        id: 'test-admin-id-v2',
        uid: 'test-admin-id-v2',
        email: 'admin@test.com',
        role: 'admin',
        full_name: 'Admin Test'
      };
      localStorage.setItem('dev_user', JSON.stringify(mockUser));
      localStorage.setItem('simulated_role', 'admin');
    });
    await page.reload();
  });

  test('deve criar uma nova feira com sucesso', async ({ page }) => {
    // Navega para a aba de Feiras
    await page.click('button:has-text("Feiras")');
    
    // Inicia criação
    await page.click('button:has-text("Nova Feira")');
    
    // Passo 1: Identidade
    await page.fill('input[placeholder="Ex: Feira de Inovação Bio-Tech 2026"]', 'Feira de Teste Automatizado');
    await page.fill('textarea[placeholder="Descreva os objetivos da feira..."]', 'Esta é uma feira criada por um teste E2E.');
    await page.click('label:has-text("Aberto a todos")');
    await page.click('button:has-text("Próximo")', { force: true });
    
    // Verifica se mudou para o passo de Datas
    await expect(page.locator('h3:has-text("Cronograma")')).toBeVisible();
    
    // Passo 2: Datas
    await page.locator('input[type="date"]').nth(0).fill('2026-04-01');
    await page.locator('input[type="date"]').nth(1).fill('2026-04-15');
    await page.locator('input[type="date"]').nth(2).fill('2026-04-16');
    await page.locator('input[type="date"]').nth(3).fill('2026-04-30');
    await page.locator('input[type="date"]').nth(4).fill('2026-05-01');
    await page.click('button:has-text("Próximo")', { force: true });
    
    // Verifica se mudou para o passo de Estrutura
    await expect(page.locator('h3:has-text("Categorias e Modalidades")')).toBeVisible();
    
    // Passo 3: Estrutura
    await page.fill('input[placeholder="Nova categoria..."]', 'Ciência');
    await page.keyboard.press('Enter');
    await page.fill('input[placeholder="Nova modalidade..."]', 'Banner');
    await page.keyboard.press('Enter');
    await page.click('button:has-text("Próximo")', { force: true });
    
    // Passo 4: Formulário
    await page.click('button:has-text("Próximo")', { force: true });
    
    // Passo 5: Regras
    await page.click('button:has-text("Próximo")', { force: true });
    
    // Passo 6: Revisão e Finalizar
    await page.click('button:has-text("Finalizar e Publicar")');
    
    // Verifica se voltou para a lista e se a feira aparece
    await expect(page.locator('h2:has-text("Feiras")')).toBeVisible();
    await expect(page.locator('text=Feira de Teste Automatizado')).toBeVisible();
  });
});
