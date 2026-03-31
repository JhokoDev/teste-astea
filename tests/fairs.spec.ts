import { test, expect } from '@playwright/test';

test.describe('Fluxo de Criação de Feiras', () => {
  test.beforeEach(async ({ page }) => {
    // Captura logs do console do navegador
    page.on('console', msg => {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });

    // Simula login como admin
    await page.goto('/');
    await page.evaluate(() => {
      const mockUser = {
        id: 'd3b07384-d9a4-4475-9c8a-4d6a7828f45a',
        uid: 'd3b07384-d9a4-4475-9c8a-4d6a7828f45a',
        email: 'admin@test.com',
        role: 'admin',
        full_name: 'Admin Test'
      };
      localStorage.setItem('dev_user', JSON.stringify(mockUser));
      localStorage.setItem('simulated_role', 'admin');
    });
    await page.reload();
    
    // Espera o carregamento inicial sumir
    await page.waitForSelector('.animate-spin', { state: 'hidden' });
    
    // Esconde o FAB que pode interceptar cliques
    await page.addStyleTag({ content: '.fixed.bottom-6 { display: none !important; }' });
  });

  test('deve criar uma nova feira com sucesso', async ({ page }) => {
    const timestamp = Date.now();
    const fairName = `Feira Teste ${timestamp}`;
    
    // Navega para a aba de Feiras
    await page.click('button:has-text("Feiras")');
    
    // Espera carregar a lista de feiras
    await page.waitForSelector('h2:has-text("Gestão de Feiras")');
    await page.waitForSelector('.animate-spin', { state: 'hidden' });
    
    // Inicia criação
    await page.click('button:has-text("Nova Feira")');
    
    // Passo 1: Identidade
    await page.fill('input[placeholder="Ex: Feira de Inovação Bio-Tech 2026"]', fairName);
    await page.fill('textarea[placeholder="Descreva os objetivos da feira..."]', 'Esta é uma feira criada por um teste E2E.');
    await page.click('label:has-text("Aberto a todos")');
    await page.click('button:has-text("Próximo")');
    
    // Verifica se mudou para o passo de Datas
    await expect(page.locator('h3:has-text("Cronograma")')).toBeVisible();
    
    // Passo 2: Datas
    await page.locator('input[type="date"]').nth(0).fill('2026-04-01');
    await page.locator('input[type="date"]').nth(1).fill('2026-04-15');
    await page.locator('input[type="date"]').nth(2).fill('2026-04-16');
    await page.locator('input[type="date"]').nth(3).fill('2026-04-30');
    await page.locator('input[type="date"]').nth(4).fill('2026-05-01');
    await page.click('button:has-text("Próximo")');
    
    // Verifica se mudou para o passo de Estrutura
    await expect(page.locator('h3:has-text("Categorias e Modalidades")')).toBeVisible();
    
    // Passo 3: Estrutura
    await page.fill('input[placeholder="Nova categoria..."]', 'Ciência');
    await page.keyboard.press('Enter');
    await page.fill('input[placeholder="Nova modalidade..."]', 'Banner');
    await page.keyboard.press('Enter');
    await page.click('button:has-text("Próximo")');
    
    // Passo 4: Formulário
    await page.click('button:has-text("Próximo")');
    
    // Passo 5: Regras
    await page.click('button:has-text("Próximo")');
    
    // Passo 6: Revisão e Finalizar
    await page.click('button:has-text("Finalizar")');
    
    // Espera o toast de sucesso ou a mudança de estado
    await page.waitForSelector('text=Feira criada com sucesso!', { timeout: 10000 });
    
    // Verifica se voltou para a lista e se a feira aparece
    await expect(page.locator('h2:has-text("Gestão de Feiras")')).toBeVisible({ timeout: 10000 });
    
    // Espera o nome da feira aparecer na lista
    await page.waitForSelector(`text=${fairName}`, { timeout: 15000 });
    
    // Tenta encontrar o card da feira pelo título h3
    const fairCard = page.locator('h3', { hasText: fairName });
    await expect(fairCard).toBeVisible({ timeout: 15000 });
    
    // Publica a feira para que possa ser usada em outros testes (como submissão de projetos)
    // Encontra o botão "Publicar Agora" que está no mesmo card que o título
    // Usamos um seletor mais específico para o container do card para evitar múltiplos matches
    const fairCardContainer = page.locator('div.bg-white, div.dark\\:bg-app-card', { has: fairCard }).first();
    const publishButton = fairCardContainer.locator('button:has-text("Publicar Agora")');
    await publishButton.click();
    
    // Espera o toast de sucesso da publicação
    await page.waitForSelector('text=Feira publicada com sucesso!', { timeout: 10000 });
  });
});
