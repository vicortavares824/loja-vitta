import { test, expect } from '@playwright/test';

test.describe('Vitta Basics E-Commerce Full Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the home page with hero section and branding', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('VITTA');
    await expect(page.locator('text=Basics')).toBeVisible();
    await expect(page.locator('text=Nova Coleção 2026')).toBeVisible();
  });

  test('should navigate to products catalog and filter by category', async ({ page }) => {
    // Click on Catálogo in Navbar
    await page.click('text=Catálogo');
    await expect(page.locator('h1')).toContainText('Catálogo de Peças');

    // Filter by Alfaiataria
    await page.click('button:has-text("Alfaiataria")');
    await expect(page.locator('text=Blazer Alfaiataria Minimal Noir')).toBeVisible();
  });

  test('should select color, size and add item to cart', async ({ page }) => {
    await page.click('text=Catálogo');
    
    // Select Size L on the first card
    const firstCard = page.locator('.group.relative.bg-white').first();
    await expect(firstCard).toBeVisible();

    const sizeButton = firstCard.locator('button:has-text("L")');
    if (await sizeButton.isVisible()) {
      await sizeButton.click();
    }

    // Click Buy / Comprar
    const buyButton = firstCard.locator('button:has-text("Comprar")');
    await buyButton.click();

    // Verify Cart Drawer opened
    await expect(page.locator('text=Sua Sacola')).toBeVisible();
  });

  test('should open search page, query for items and view results', async ({ page }) => {
    await page.click('nav button:has-text("Busca")');
    await expect(page.locator('h1')).toContainText('Encontre sua Peça');

    // Fill query
    const searchInput = page.locator('input[placeholder*="Ex: blazer"]');
    await searchInput.fill('Blazer');

    // Check result presence
    await expect(page.locator('text=Blazer Alfaiataria Minimal Noir')).toBeVisible();
  });

  test('should access TomatoPHP admin panel and view dashboard KPIs', async ({ page }) => {
    await page.click('text=Tomato Admin');
    await expect(page.locator('h1')).toContainText('Painel Administrativo Vitta');
    await expect(page.locator('text=Receita Total')).toBeVisible();
    await expect(page.locator('text=Pedidos Realizados')).toBeVisible();
    await expect(page.locator('text=TomatoPHP E-Commerce Core API')).toBeVisible();
  });
});
