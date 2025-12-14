import { test, expect } from '@playwright/test';

test.describe('Navigation and UX', () => {
    test('should load the home page without errors', async ({ page }) => {
        const response = await page.goto('/');
        expect(response?.status()).toBe(200);
        await expect(page).toHaveTitle(/VibeBoard|LTX/i);
    });

    test('should have working navigation links', async ({ page }) => {
        await page.goto('/');

        // Check if "New Project" button is present and clickable
        const newProjectBtn = page.locator('button:has-text("New Project")');
        await expect(newProjectBtn).toBeVisible();
        await expect(newProjectBtn).toBeEnabled();
    });

    test('should handle 404s gracefully', async ({ page }) => {
        const response = await page.goto('/non-existent-page');
        // Next.js usually returns 404 status code for non-existent pages
        expect(response?.status()).toBe(404);
        // Verify 404 page content if custom 404 exists
        // await expect(page.locator('h1')).toContainText('404');
    });
});
