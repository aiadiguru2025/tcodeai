import { test, expect } from '@playwright/test';

test.describe('Search functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the home page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('TCodeAI');
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test('should search for a T-code by name', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('ME21N');
    await searchInput.press('Enter');

    await expect(page).toHaveURL(/\/search\?q=ME21N/);
    await expect(page.locator('text=ME21N')).toBeVisible();
  });

  test('should search using natural language', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('create purchase order');
    await searchInput.press('Enter');

    await expect(page).toHaveURL(/\/search\?q=create%20purchase%20order/);
    // Should show results
    await expect(page.locator('[data-testid="search-results"]').or(page.locator('text=Results for'))).toBeVisible();
  });

  test('should show autocomplete suggestions', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('ME');

    // Wait for suggestions to appear
    await expect(page.locator('text=ME21N').first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to T-code detail page from suggestions', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('VA01');

    // Wait for and click suggestion
    await page.locator('button:has-text("VA01")').first().click();

    await expect(page).toHaveURL(/\/tcode\/VA01/);
    await expect(page.locator('text=Create Sales Order')).toBeVisible();
  });

  test('should handle keyboard navigation in suggestions', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('FB');

    // Wait for suggestions
    await expect(page.locator('button:has-text("FB01")').first()).toBeVisible({ timeout: 5000 });

    // Navigate with arrow keys
    await searchInput.press('ArrowDown');
    await searchInput.press('ArrowDown');
    await searchInput.press('Enter');

    // Should navigate to a T-code page
    await expect(page).toHaveURL(/\/tcode\//);
  });

  test('should clear search with X button', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('test query');

    // Click clear button
    await page.locator('button:has(svg.lucide-x)').click();

    await expect(searchInput).toHaveValue('');
  });

  test('should focus search with / key', async ({ page }) => {
    // Click somewhere else first
    await page.locator('body').click();

    // Press / key
    await page.keyboard.press('/');

    // Search input should be focused
    await expect(page.getByPlaceholder(/search/i)).toBeFocused();
  });
});

test.describe('T-code detail page', () => {
  test('should display T-code details', async ({ page }) => {
    await page.goto('/tcode/ME21N');

    await expect(page.locator('code:has-text("ME21N")')).toBeVisible();
    await expect(page.locator('text=Create Purchase Order')).toBeVisible();
    await expect(page.locator('text=MM')).toBeVisible(); // Module badge
  });

  test('should show related T-codes', async ({ page }) => {
    await page.goto('/tcode/ME21N');

    // Should show related codes like ME22N, ME23N
    await expect(page.locator('text=Related Transaction Codes')).toBeVisible();
  });

  test('should copy T-code to clipboard', async ({ page }) => {
    await page.goto('/tcode/ME21N');

    // Click copy button
    await page.locator('button[title*="Copy"]').click();

    // Check for success indicator (checkmark appears)
    await expect(page.locator('svg.lucide-check')).toBeVisible({ timeout: 2000 });
  });

  test('should toggle bookmark', async ({ page }) => {
    await page.goto('/tcode/VA01');

    const bookmarkButton = page.locator('button[title*="bookmark"]');
    await bookmarkButton.click();

    // Bookmark should be filled
    await expect(page.locator('svg.lucide-bookmark.fill-current')).toBeVisible();
  });
});

test.describe('Modules page', () => {
  test('should display module list', async ({ page }) => {
    await page.goto('/modules');

    await expect(page.locator('h1:has-text("SAP Modules")')).toBeVisible();
    await expect(page.locator('text=Materials Management')).toBeVisible();
    await expect(page.locator('text=Sales and Distribution')).toBeVisible();
  });
});

test.describe('Bookmarks page', () => {
  test('should display empty state when no bookmarks', async ({ page }) => {
    // Clear localStorage first
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    await page.goto('/bookmarks');

    await expect(page.locator('text=No bookmarks yet')).toBeVisible();
  });

  test('should display bookmarked T-codes', async ({ page }) => {
    // Add a bookmark via localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'tcodeai_bookmarks',
        JSON.stringify([
          { id: '1', tcode: 'ME21N', notes: null, createdAt: new Date().toISOString() },
        ])
      );
    });

    await page.goto('/bookmarks');

    await expect(page.locator('text=ME21N')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Search input should have aria-label
    await expect(page.locator('input[aria-label*="Search"]')).toBeVisible();
  });

  test('should be navigable by keyboard', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to focus on navigation links
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
