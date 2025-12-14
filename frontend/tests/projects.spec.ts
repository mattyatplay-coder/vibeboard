import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should allow creating a new project', async ({ page }) => {
        // Click "New Project" button
        await page.click('button:has-text("New Project")');

        // Fill in project details
        const timestamp = Date.now();
        const projectName = `Test Project ${timestamp}`;
        await page.fill('input[placeholder="My Awesome Movie"]', projectName);
        await page.fill('input[placeholder="A sci-fi thriller about..."]', 'E2E Test Description');

        // Submit form
        await page.click('button:has-text("Create Project")');

        // Verify project appears in list
        await expect(page.locator('h3', { hasText: projectName })).toBeVisible();
    });

    test('should navigate to project details', async ({ page }) => {
        // Assuming at least one project exists (or we create one)
        // For robustness, let's create one first if the list is empty, but for now let's assume the previous test ran or we just create one.

        const timestamp = Date.now();
        const projectName = `Nav Test ${timestamp}`;

        await page.click('button:has-text("New Project")');
        await page.fill('input[placeholder="My Awesome Movie"]', projectName);
        await page.click('button:has-text("Create Project")');

        // Click on the project card
        await page.click(`h3:has-text("${projectName}")`);

        // Verify navigation
        await expect(page).toHaveURL(/\/projects\/.*\/elements/);
    });
});
