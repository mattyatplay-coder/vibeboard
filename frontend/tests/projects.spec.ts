import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
    const mockProjectId = 'test-project-123';

    test.beforeEach(async ({ page }) => {
        // Mock API endpoints before navigating
        await page.route('**/api/projects', async (route) => {
            const method = route.request().method();
            if (method === 'GET') {
                // Return existing projects
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        { id: mockProjectId, name: 'Test Project', description: 'Test', updatedAt: new Date().toISOString() }
                    ])
                });
            } else if (method === 'POST') {
                // Create new project - return success
                const body = route.request().postDataJSON();
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        id: `new-${Date.now()}`,
                        name: body?.name || 'New Project',
                        description: body?.description || '',
                        updatedAt: new Date().toISOString()
                    })
                });
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should allow creating a new project', async ({ page }) => {
        // Wait for New Project button to be available
        const newProjectButton = page.locator('button:has-text("New Project")');
        await expect(newProjectButton).toBeVisible({ timeout: 10000 });
        await newProjectButton.click();

        // Fill in project details
        const timestamp = Date.now();
        const projectName = `Test Project ${timestamp}`;

        // Wait for the modal/form to appear
        const nameInput = page.locator('input[placeholder="My Awesome Movie"]');
        await expect(nameInput).toBeVisible({ timeout: 5000 });
        await nameInput.fill(projectName);

        const descInput = page.locator('input[placeholder="A sci-fi thriller about..."]');
        if (await descInput.isVisible()) {
            await descInput.fill('E2E Test Description');
        }

        // Submit form
        const createButton = page.locator('button:has-text("Create Project")');
        await createButton.click();

        // Wait for the form to close
        await expect(nameInput).not.toBeVisible({ timeout: 10000 });

        // Project should appear in the list (mock returns it)
        await expect(page.locator('h3').first()).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to project details', async ({ page }) => {
        // Wait for project card to appear (from mock)
        const projectCard = page.locator(`h3:has-text("Test Project")`);
        await expect(projectCard).toBeVisible({ timeout: 10000 });

        // Click on the project card
        await projectCard.click();

        // Verify navigation (default project page is now story-editor)
        await expect(page).toHaveURL(/\/projects\/.*\/(story-editor|elements|generate)/, { timeout: 10000 });
    });
});
