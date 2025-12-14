import { test, expect } from '@playwright/test';

test.describe('Generation Flow', () => {
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to projects page
    await page.goto('/');

    // Create a project for testing
    const timestamp = Date.now();
    const projectName = `Gen Test ${timestamp}`;
    await page.click('button:has-text("New Project")');
    await page.fill('input[placeholder="My Awesome Movie"]', projectName);
    await page.click('button:has-text("Create Project")');

    // Wait for project to appear and click it
    await page.click(`h3:has-text("${projectName}")`);

    // Wait for navigation to complete
    await expect(page).toHaveURL(/\/projects\/.*\/elements/);

    // Get project ID from URL
    const url = page.url();
    const match = url.match(/\/projects\/([^\/]+)/);
    if (match) {
      projectId = match[1];
    }

    // Navigate to Generate tab
    // Assuming there's a navigation link or we can go directly
    // Let's check if there's a "Generate" link in the sidebar or header
    // If not, we can construct the URL
    await page.goto(`/projects/${projectId}/generate`);
  });

  test('should allow entering a prompt and generating', async ({ page }) => {
    // Mock the generation API
    await page.route('**/api/projects/**/generations', async route => {
      if (route.request().method() === 'POST') {
        // Simulate a delay to verify loading state
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      } else {
        await route.continue();
      }
    });

    // Enter prompt
    const prompt = 'A futuristic city skyline at sunset';
    await page.fill('textarea[data-testid="prompt-input"]', prompt);

    // Click Generate
    await page.click('button[data-testid="generate-button"]');

    // Verify loading state
    await expect(page.locator('button[data-testid="generate-button"]')).toHaveText(/Generating/);

    // Wait for the button to reset (indicating completion)
    await expect(page.locator('button[data-testid="generate-button"]')).toHaveText(/Generate/);
  });
});

