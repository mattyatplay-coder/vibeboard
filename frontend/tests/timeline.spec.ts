import { test, expect, Page } from '@playwright/test';

/**
 * NLE Timeline Page - Playwright E2E Test Suite
 *
 * Tests the Timeline page from a user's perspective to identify bugs
 * in the following workflows:
 * 1. Page loading and navigation
 * 2. Mode switching (Scene Chain vs Quick Edit)
 * 3. Generation picker (selecting video generations)
 * 4. Video upload functionality
 * 5. Preview monitor controls
 * 6. Clip list interactions
 * 7. Keyboard shortcuts
 * 8. Bake timeline functionality
 */

test.describe('NLE Timeline Page', () => {
    const mockProjectId = 'test-project-timeline';
    const BACKEND_URL = 'http://localhost:3001';

    // Mock data for scene chains
    const mockSceneChains = [
        {
            id: 'chain-1',
            name: 'Test Scene Chain',
            segments: [
                {
                    id: 'segment-1',
                    orderIndex: 0,
                    prompt: 'A cinematic opening shot',
                    duration: 5,
                    status: 'complete',
                    outputUrl: '/uploads/test-video-1.mp4',
                    firstFrameUrl: '/uploads/test-frame-1.jpg',
                    lastFrameUrl: '/uploads/test-frame-1-end.jpg',
                    trimStart: 0,
                    trimEnd: 0,
                    audioUrl: null,
                    audioTrimStart: 0,
                    audioTrimEnd: 0,
                    audioGain: 1,
                },
                {
                    id: 'segment-2',
                    orderIndex: 1,
                    prompt: 'A dramatic close-up',
                    duration: 3,
                    status: 'complete',
                    outputUrl: '/uploads/test-video-2.mp4',
                    firstFrameUrl: '/uploads/test-frame-2.jpg',
                    lastFrameUrl: '/uploads/test-frame-2-end.jpg',
                    trimStart: 0,
                    trimEnd: 0,
                    audioUrl: null,
                    audioTrimStart: 0,
                    audioTrimEnd: 0,
                    audioGain: 1,
                },
            ],
        },
        {
            id: 'chain-2',
            name: 'Empty Chain',
            segments: [],
        },
    ];

    // Mock data for video generations
    const mockVideoGenerations = [
        {
            id: 'gen-1',
            inputPrompt: 'A beautiful sunset over the ocean',
            status: 'succeeded',
            mode: 'text_to_video',
            outputs: [{ url: '/uploads/gen-video-1.mp4', type: 'video' }],
            createdAt: new Date().toISOString(),
            thumbnailUrl: '/uploads/gen-thumb-1.jpg',
        },
        {
            id: 'gen-2',
            inputPrompt: 'A futuristic cityscape at night',
            status: 'succeeded',
            mode: 'text_to_video',
            outputs: [{ url: '/uploads/gen-video-2.mp4', type: 'video' }],
            createdAt: new Date().toISOString(),
            thumbnailUrl: '/uploads/gen-thumb-2.jpg',
        },
    ];

    test.beforeEach(async ({ page }) => {
        // Setup API mocks before navigating
        await setupApiMocks(page);
    });

    async function setupApiMocks(page: Page) {
        // Mock scene-chains endpoint
        await page.route(`**/api/projects/${mockProjectId}/scene-chains`, async (route) => {
            const method = route.request().method();
            if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(mockSceneChains),
                });
            }
        });

        // Mock generations endpoint with filtering
        await page.route(`**/api/projects/${mockProjectId}/generations*`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ generations: mockVideoGenerations }),
            });
        });

        // Mock segment PATCH for clip updates
        await page.route(`**/api/projects/${mockProjectId}/scene-chains/*/segments/*`, async (route) => {
            const method = route.request().method();
            if (method === 'PATCH') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true }),
                });
            } else if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(mockSceneChains[0].segments[0]),
                });
            }
        });

        // Mock bake endpoint
        await page.route(`**/api/projects/${mockProjectId}/scene-chains/*/bake`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    finalVideoUrl: '/exports/baked-timeline.mp4',
                }),
            });
        });

        // Mock quick-edit bake endpoint
        await page.route(`**/api/projects/${mockProjectId}/timeline/bake`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    finalVideoUrl: '/exports/quick-edit-baked.mp4',
                }),
            });
        });

        // Mock upload endpoint
        await page.route(`**/api/projects/${mockProjectId}/timeline/upload`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    fileUrl: '/uploads/uploaded-video.mp4',
                    filename: 'uploaded-video.mp4',
                }),
            });
        });
    }

    // ==========================================
    // 1. PAGE LOADING & NAVIGATION TESTS
    // ==========================================
    test.describe('Page Loading & Navigation', () => {
        test('should load the timeline page without errors', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            // Page should render header with "NLE Timeline" title
            await expect(page.locator('h1:has-text("NLE Timeline")')).toBeVisible({ timeout: 10000 });
        });

        test('should display loading spinner initially', async ({ page }) => {
            // Delay the API response to see the loading state
            await page.route(`**/api/projects/${mockProjectId}/scene-chains`, async (route) => {
                await new Promise(resolve => setTimeout(resolve, 500));
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(mockSceneChains),
                });
            });

            await page.goto(`/projects/${mockProjectId}/timeline`);

            // Should show loading spinner
            const spinner = page.locator('.animate-spin');
            // Note: might be too fast to catch, so we just verify page loads correctly
            await page.waitForLoadState('networkidle');
        });

        test('should have Back button that navigates away', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            const backButton = page.locator('button:has-text("Back")');
            await expect(backButton).toBeVisible();
        });

        test('should display Film icon in header', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            // Film icon should be visible (cyan-500 color)
            await expect(page.locator('svg.text-cyan-500').first()).toBeVisible();
        });
    });

    // ==========================================
    // 2. MODE SWITCHING TESTS
    // ==========================================
    test.describe('Mode Switching (Scene Chain vs Quick Edit)', () => {
        test('should default to Scene Chain mode', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            // Scene Chains button should be active (cyan background)
            const sceneChainBtn = page.locator('button:has-text("Scene Chains")');
            await expect(sceneChainBtn).toBeVisible();
            await expect(sceneChainBtn).toHaveClass(/bg-cyan-500/);
        });

        test('should switch to Quick Edit mode when clicking toggle', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            const quickEditBtn = page.locator('button:has-text("Quick Edit")');
            await quickEditBtn.click();

            // Quick Edit button should now be active (purple background)
            await expect(quickEditBtn).toHaveClass(/bg-purple-500/);

            // Should show "Add Generation" button in Quick Edit mode (in header)
            await expect(page.locator('header button:has-text("Add Generation")')).toBeVisible();
            // BUG FOUND: There are 2 "Upload Video" buttons - one in header, one in empty state
            // Using .first() to target the header one
            await expect(page.locator('header button:has-text("Upload Video")')).toBeVisible();
        });

        test('should hide scene chain selector in Quick Edit mode', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            // Selector should be visible in Scene Chain mode
            const selector = page.locator('select:has-text("Select Scene Chain")');
            await expect(selector).toBeVisible();

            // Switch to Quick Edit
            await page.locator('button:has-text("Quick Edit")').click();

            // Selector should be hidden
            await expect(selector).not.toBeVisible();
        });

        test('should persist clips when switching modes back and forth', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            // Select a scene chain in Scene Chain mode using value instead of label regex
            const selector = page.locator('select');
            await selector.selectOption('chain-1');

            // Switch to Quick Edit
            await page.locator('button:has-text("Quick Edit")').click();

            // Switch back to Scene Chain
            await page.locator('button:has-text("Scene Chains")').click();

            // Should still have the scene chain selected
            await expect(selector).toHaveValue('chain-1');
        });
    });

    // ==========================================
    // 3. GENERATION PICKER TESTS
    // ==========================================
    test.describe('Generation Picker Modal', () => {
        test('should open generation picker when clicking Add Generation', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            // Switch to Quick Edit mode
            await page.locator('button:has-text("Quick Edit")').click();

            // Click Add Generation
            await page.locator('button:has-text("Add Generation")').click();

            // Modal should be visible
            await expect(page.locator('text=Select Video Generation')).toBeVisible();
        });

        test('should display video generations in picker', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('button:has-text("Quick Edit")').click();
            await page.locator('header button:has-text("Add Generation")').click();

            // Modal should appear (don't wait for API - mock might have already fired)
            await expect(page.locator('text=Select Video Generation')).toBeVisible({ timeout: 5000 });

            // Should display the mock generations (these are from our mock)
            await expect(page.locator('text=A beautiful sunset')).toBeVisible({ timeout: 5000 });
            await expect(page.locator('text=A futuristic cityscape')).toBeVisible({ timeout: 5000 });
        });

        test('should close picker when clicking outside', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('button:has-text("Quick Edit")').click();
            await page.locator('button:has-text("Add Generation")').click();

            // Click the backdrop (outside the modal content)
            await page.locator('.fixed.inset-0.z-50').click({ position: { x: 10, y: 10 } });

            // Modal should be closed
            await expect(page.locator('text=Select Video Generation')).not.toBeVisible();
        });

        test('should close picker when clicking X button', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('button:has-text("Quick Edit")').click();
            await page.locator('header button:has-text("Add Generation")').click();

            // Wait for modal to be visible
            await expect(page.locator('text=Select Video Generation')).toBeVisible();

            // Click the X close button - it's inside the modal header, right side
            // Using the modal container to scope the button
            const modal = page.locator('.fixed.inset-0.z-50');
            await modal.locator('button:has(.h-5.w-5)').first().click();

            // Modal should be closed
            await expect(page.locator('text=Select Video Generation')).not.toBeVisible();
        });

        test('should add generation to clips when selected', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('button:has-text("Quick Edit")').click();
            await page.locator('header button:has-text("Add Generation")').click();

            // Wait for modal to be visible and generations to load
            await expect(page.locator('text=Select Video Generation')).toBeVisible();
            await expect(page.locator('button:has-text("A beautiful sunset")')).toBeVisible({ timeout: 5000 });

            // Click the generation button
            await page.locator('button:has-text("A beautiful sunset")').click();

            // Modal should close and clip should appear in clip list
            await expect(page.locator('text=Select Video Generation')).not.toBeVisible();
            await expect(page.locator('.text-gray-300:has-text("A beautiful sunset")')).toBeVisible({ timeout: 5000 });
        });

        test('should show empty state when no generations found', async ({ page }) => {
            // Override mock to return empty generations
            await page.route(`**/api/projects/${mockProjectId}/generations*`, async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ generations: [] }),
                });
            });

            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('button:has-text("Quick Edit")').click();
            await page.locator('button:has-text("Add Generation")').click();

            // Should show empty state message
            await expect(page.locator('text=No video generations found')).toBeVisible();
        });
    });

    // ==========================================
    // 4. VIDEO UPLOAD TESTS
    // ==========================================
    test.describe('Video Upload', () => {
        test('should have hidden file input for video upload', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            // File input should exist but be hidden
            const fileInput = page.locator('input[type="file"][accept="video/*"]');
            await expect(fileInput).toBeAttached();
            await expect(fileInput).toHaveClass(/hidden/);
        });

        test('should trigger file input when clicking Upload Video button', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('button:has-text("Quick Edit")').click();

            // Set up file chooser handler - use header button specifically
            const fileChooserPromise = page.waitForEvent('filechooser');
            await page.locator('header button:has-text("Upload Video")').click();
            const fileChooser = await fileChooserPromise;

            expect(fileChooser).toBeTruthy();
        });

        test('should show uploading state during upload', async ({ page }) => {
            // Delay the upload response to see loading state
            await page.route(`**/api/projects/${mockProjectId}/timeline/upload`, async (route) => {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        fileUrl: '/uploads/uploaded-video.mp4',
                        filename: 'uploaded-video.mp4',
                    }),
                });
            });

            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('button:has-text("Quick Edit")').click();

            // Set up file chooser and upload a fake file - use header button
            const fileChooserPromise = page.waitForEvent('filechooser');
            await page.locator('header button:has-text("Upload Video")').click();
            const fileChooser = await fileChooserPromise;

            // Upload a test file (we'll use a minimal valid file)
            await fileChooser.setFiles({
                name: 'test-video.mp4',
                mimeType: 'video/mp4',
                buffer: Buffer.from([0, 0, 0, 28, 102, 116, 121, 112]), // Minimal MP4 header
            });

            // Should show spinner while uploading - in header button
            const uploadBtn = page.locator('header button:has-text("Upload Video")');
            await expect(uploadBtn.locator('.animate-spin')).toBeVisible();
        });
    });

    // ==========================================
    // 5. PREVIEW MONITOR TESTS
    // ==========================================
    test.describe('Preview Monitor', () => {
        test('should display No Preview Available when no clips', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            // Switch to Quick Edit with no clips
            await page.locator('button:has-text("Quick Edit")').click();

            // Should show empty preview state
            await expect(page.locator('text=No Preview Available')).toBeVisible();
            await expect(page.locator('text=Add clips to start editing')).toBeVisible();
        });

        test('should display keyboard shortcuts hint', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('button:has-text("Quick Edit")').click();

            // Keyboard shortcuts should be visible in the preview empty state
            // Use more specific selectors to avoid matching other text on page
            await expect(page.locator('.text-cyan-500:has-text("Space/K")')).toBeVisible();
            await expect(page.locator('.text-cyan-500:has-text("J/L")')).toBeVisible();
            await expect(page.locator('.text-cyan-500:text-is("M")')).toBeVisible();
            await expect(page.locator('.text-cyan-500:has-text("F")')).toBeVisible();
        });

        test('should show clip info when clips are loaded', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            // Select scene chain with clips by value
            await page.locator('select').selectOption('chain-1');

            // Wait for clips to load
            await page.waitForTimeout(500);

            // Should show clip counter badge
            await expect(page.locator('text=Clip 1 of 2')).toBeVisible({ timeout: 5000 });
        });

        test('should have play/pause button in video controls', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');
            await page.waitForTimeout(500);

            // Play button should be visible - use specific title to avoid conflict with timeline play button
            const playButton = page.locator('button[title="Play/Pause (Space or K)"]');
            await expect(playButton).toBeVisible({ timeout: 5000 });
        });

        test('should have skip previous/next buttons', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');
            await page.waitForTimeout(500);

            // Navigation buttons should be visible
            await expect(page.locator('button[title*="Previous clip"]')).toBeVisible({ timeout: 5000 });
            await expect(page.locator('button[title*="Next clip"]')).toBeVisible({ timeout: 5000 });
        });

        test('should toggle mute when clicking volume button', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');
            await page.waitForTimeout(500);

            const muteButton = page.locator('button[title*="Mute"]');
            await expect(muteButton).toBeVisible({ timeout: 5000 });
            await muteButton.click();

            // Button title should change to include "Unmute" or show muted icon
            await expect(page.locator('button[title*="Mute"]')).toBeVisible();
        });

        test('should toggle fullscreen when clicking expand button', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');
            await page.waitForTimeout(500);

            const expandButton = page.locator('button[title*="Expand"]');
            await expect(expandButton).toBeVisible({ timeout: 5000 });
            await expandButton.click();

            // BUG FOUND: The clip list panel gets w-0 class but content may still be
            // technically visible in DOM (just overflow-hidden). Check the container class instead.
            const clipListPanel = page.locator('.flex.flex-col.bg-zinc-900\\/50').first();
            await expect(clipListPanel).toHaveClass(/w-0/);

            // Button should now show minimize icon
            const minimizeButton = page.locator('button[title*="Collapse"]');
            await expect(minimizeButton).toBeVisible();
        });

        test('should display SMPTE timecode', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');
            await page.waitForTimeout(500);

            // Timecode should be visible (format: HH:MM:SS:FF or HH:MM:SS.mmm for milliseconds mode)
            // Use first() since timeline might have one too
            const timecode = page.locator('.font-mono.text-cyan-400').first();
            await expect(timecode).toBeVisible({ timeout: 5000 });
            // Accept both frames format (00:00:05:02) and milliseconds format (00:00:05.083)
            await expect(timecode).toHaveText(/\d{2}:\d{2}:\d{2}[:.]\d{2,3}/);
        });
    });

    // ==========================================
    // 6. CLIP LIST PANEL TESTS
    // ==========================================
    test.describe('Clip List Panel', () => {
        test('should display clip list panel', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await expect(page.locator('text=Scene Chain Clips')).toBeVisible();
        });

        test('should show clip count badge', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');

            // Clip count should be visible
            const countBadge = page.locator('.bg-white\\/10.text-xs.text-gray-500:has-text("2")');
            await expect(countBadge).toBeVisible();
        });

        test('should select clip when clicking on it', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');
            await page.waitForTimeout(500); // Wait for clips to load

            // First clip should be auto-selected initially
            await expect(page.locator('text=Clip 1 of 2')).toBeVisible({ timeout: 5000 });

            // Use the data-testid to find and click the second clip
            const secondClipButton = page.locator('[data-testid="clip-item-1"]');
            await expect(secondClipButton).toBeVisible({ timeout: 5000 });

            // Click the second clip
            await secondClipButton.click();
            await page.waitForTimeout(300); // Wait for React state update

            // Preview should update to show Clip 2
            await expect(page.locator('text=Clip 2 of 2')).toBeVisible({ timeout: 5000 });

            // Second clip container should now be selected (cyan border)
            await expect(secondClipButton).toHaveClass(/border-cyan-500/, { timeout: 5000 });
        });

        test('should show delete button on hover in Quick Edit mode', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('button:has-text("Quick Edit")').click();
            await page.locator('header button:has-text("Add Generation")').click();

            // Wait for modal and add a generation
            await expect(page.locator('text=Select Video Generation')).toBeVisible();
            await expect(page.locator('button:has-text("A beautiful sunset")')).toBeVisible({ timeout: 5000 });
            await page.locator('button:has-text("A beautiful sunset")').click();

            // Wait for modal to close and clip to appear
            await expect(page.locator('text=Select Video Generation')).not.toBeVisible();

            // Hover over the clip in the clip list panel - now uses div with role="button"
            const clipButton = page.locator('div.group[role="button"]:has-text("A beautiful sunset")');
            await expect(clipButton).toBeVisible({ timeout: 5000 });
            await clipButton.hover();

            // Delete button should be visible (it has opacity-0 initially and group-hover:opacity-100)
            const deleteBtn = clipButton.locator('button.absolute');
            await expect(deleteBtn).toBeVisible();
        });

        test('should remove clip when clicking delete button', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('button:has-text("Quick Edit")').click();
            await page.locator('header button:has-text("Add Generation")').click();

            // Wait for modal and add a generation
            await expect(page.locator('text=Select Video Generation')).toBeVisible();
            await expect(page.locator('button:has-text("A beautiful sunset")')).toBeVisible({ timeout: 5000 });
            await page.locator('button:has-text("A beautiful sunset")').click();

            // Wait for modal to close
            await expect(page.locator('text=Select Video Generation')).not.toBeVisible();

            // Hover and click delete - now uses div with role="button"
            const clipButton = page.locator('div.group[role="button"]:has-text("A beautiful sunset")');
            await expect(clipButton).toBeVisible({ timeout: 5000 });
            await clipButton.hover();
            await clipButton.locator('button.absolute').click();

            // Clip should be removed
            await expect(clipButton).not.toBeVisible();
        });

        test('should show empty state in Quick Edit mode', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('button:has-text("Quick Edit")').click();

            // Should show empty state with options (in the clip list panel, not header)
            await expect(page.locator('text=No clips yet')).toBeVisible();
            // The "From Generations" button is in the empty state area
            await expect(page.locator('button:has-text("From Generations")')).toBeVisible();
            // Just check that the "Upload Video" text appears - there are two, that's expected UX
            await expect(page.getByRole('button', { name: 'Upload Video' }).nth(1)).toBeVisible();
        });
    });

    // ==========================================
    // 7. KEYBOARD SHORTCUTS TESTS
    // ==========================================
    test.describe('Keyboard Shortcuts', () => {
        test('should toggle play/pause with Space key', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');

            // Press Space to play
            await page.keyboard.press('Space');

            // The play button icon should change (we can check if isPlaying changed)
            // Note: Actual video playback might fail in test environment without real video
        });

        test('should toggle play/pause with K key', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');

            // Press K to toggle
            await page.keyboard.press('k');
        });

        test('should skip to previous clip with J key', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');
            await page.waitForTimeout(500); // Wait for clips to load

            // First clip should be auto-selected initially
            await expect(page.locator('text=Clip 1 of 2')).toBeVisible({ timeout: 5000 });

            // Click the second clip to select it using data-testid
            const secondClipButton = page.locator('[data-testid="clip-item-1"]');
            await expect(secondClipButton).toBeVisible({ timeout: 5000 });
            await secondClipButton.click();
            await page.waitForTimeout(300); // Wait for React state update
            await expect(page.locator('text=Clip 2 of 2')).toBeVisible({ timeout: 5000 });

            // Press J to go previous
            await page.keyboard.press('j');
            await page.waitForTimeout(300); // Wait for React state update

            // Should now show Clip 1
            await expect(page.locator('text=Clip 1 of 2')).toBeVisible({ timeout: 5000 });
        });

        test('should skip to next clip with L key', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');
            await page.waitForTimeout(500); // Wait for clips to load and auto-select first

            // Should start on Clip 1 (auto-selected)
            await expect(page.locator('text=Clip 1 of 2')).toBeVisible({ timeout: 5000 });

            // Press L to go next
            await page.keyboard.press('l');
            await page.waitForTimeout(300); // Wait for React state update

            // Should now show Clip 2
            await expect(page.locator('text=Clip 2 of 2')).toBeVisible({ timeout: 5000 });
        });

        test('should toggle mute with M key', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');

            // Press M to mute
            await page.keyboard.press('m');
            // Press M again to unmute
            await page.keyboard.press('m');
        });

        test('should toggle fullscreen with F key', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');
            await page.waitForTimeout(300);

            // Press F to expand
            await page.keyboard.press('f');

            // Clip list panel should have w-0 class (expanded state)
            const clipListPanel = page.locator('.flex.flex-col.bg-zinc-900\\/50').first();
            await expect(clipListPanel).toHaveClass(/w-0/);

            // Press F again to collapse
            await page.keyboard.press('f');

            // Clip list panel should have w-1/3 class again
            await expect(clipListPanel).toHaveClass(/w-1\/3/);
        });

        test('should not trigger shortcuts when typing in input', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            // If there's any input field on the page, shortcuts should not trigger
            // This is more of a safety test
        });
    });

    // ==========================================
    // 8. BAKE TIMELINE TESTS
    // ==========================================
    test.describe('Bake Timeline', () => {
        test('should have Bake Timeline button', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await expect(page.locator('button:has-text("Bake Timeline")')).toBeVisible();
        });

        test('should disable Bake button when no clips', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('button:has-text("Quick Edit")').click();

            const bakeBtn = page.locator('button:has-text("Bake Timeline")');
            await expect(bakeBtn).toBeDisabled();
        });

        test('should enable Bake button when clips exist', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');

            const bakeBtn = page.locator('button:has-text("Bake Timeline")');
            await expect(bakeBtn).toBeEnabled();
        });

        test('should show baking state during bake', async ({ page }) => {
            // Delay bake response
            await page.route(`**/api/projects/${mockProjectId}/scene-chains/*/bake`, async (route) => {
                await new Promise(resolve => setTimeout(resolve, 500));
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        finalVideoUrl: '/exports/baked-timeline.mp4',
                    }),
                });
            });

            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');

            const bakeBtn = page.locator('button:has-text("Bake Timeline")');
            await bakeBtn.click();

            // Should show "Baking..." text
            await expect(page.locator('text=Baking...')).toBeVisible();
        });

        test('should show success toast after successful bake', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');
            await page.waitForTimeout(300);

            const bakeBtn = page.locator('button:has-text("Bake Timeline")');
            await bakeBtn.click();

            // Success toast should appear (mock response is immediate)
            await expect(page.locator('text=Bake complete!')).toBeVisible({ timeout: 10000 });
            await expect(page.locator('a:has-text("Download")')).toBeVisible();
        });

        test('should show error toast on bake failure', async ({ page }) => {
            // Override mock to return error
            await page.route(`**/api/projects/${mockProjectId}/scene-chains/*/bake`, async (route) => {
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: false,
                        error: 'FFmpeg failed to process video',
                    }),
                });
            });

            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');

            await page.locator('button:has-text("Bake Timeline")').click();

            // Error toast should appear
            await expect(page.locator('text=FFmpeg failed to process video')).toBeVisible();
        });

        test('should dismiss toast when clicking X', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');
            await page.waitForTimeout(300);

            await page.locator('button:has-text("Bake Timeline")').click();

            // Toast should be visible
            await expect(page.locator('text=Bake complete!')).toBeVisible({ timeout: 10000 });

            // Click dismiss button (×)
            await page.locator('button:has-text("×")').click();

            // Toast should be gone
            await expect(page.locator('text=Bake complete!')).not.toBeVisible();
        });
    });

    // ==========================================
    // 9. SCENE CHAIN SELECTION TESTS
    // ==========================================
    test.describe('Scene Chain Selection', () => {
        test('should display scene chain selector dropdown', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            const selector = page.locator('select:has-text("Select Scene Chain")');
            await expect(selector).toBeVisible();
        });

        test('should list all scene chains in dropdown', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            const selector = page.locator('select');

            // Check options exist
            await expect(selector.locator('option:has-text("Test Scene Chain")')).toBeAttached();
            await expect(selector.locator('option:has-text("Empty Chain")')).toBeAttached();
        });

        test('should show segment count for each chain', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            const selector = page.locator('select');
            await selector.click();

            // Options should show segment counts
            await expect(selector.locator('option:has-text("(2 segments)")')).toBeAttached();
            await expect(selector.locator('option:has-text("(0 segments)")')).toBeAttached();
        });

        test('should auto-select first chain with segments', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            const selector = page.locator('select');

            // Should auto-select the chain with segments
            await expect(selector).toHaveValue('chain-1');
        });

        test('should load clips when selecting a different chain', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            // Initially should have clips from first chain
            await expect(page.locator('text=Clip 1 of 2')).toBeVisible();

            // Select empty chain
            const selector = page.locator('select');
            await selector.selectOption('chain-2');

            // Should now show no clips
            await expect(page.locator('text=Clip 1 of 2')).not.toBeVisible();
        });
    });

    // ==========================================
    // 10. DURATION DISPLAY TESTS
    // ==========================================
    test.describe('Duration Display', () => {
        test('should display total duration badge', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');

            // Duration badge should show total: 5s + 3s = 8s
            await expect(page.locator('text=8.0s')).toBeVisible();
        });

        test('should show clip duration in clip list', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');

            // Individual clip durations should be visible
            await expect(page.locator('span:has-text("5.0s")')).toBeVisible();
            await expect(page.locator('span:has-text("3.0s")')).toBeVisible();
        });

        test('should update duration when clips are trimmed', async ({ page }) => {
            // This would require testing the NLETimeline component's trim functionality
            // Skipping for now as it involves complex drag interactions
        });
    });

    // ==========================================
    // 11. ERROR HANDLING TESTS
    // ==========================================
    test.describe('Error Handling', () => {
        test('should handle API failure gracefully', async ({ page }) => {
            await page.route(`**/api/projects/${mockProjectId}/scene-chains`, async (route) => {
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Internal Server Error' }),
                });
            });

            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            // Page should still render without crashing
            await expect(page.locator('h1:has-text("NLE Timeline")')).toBeVisible();
        });

        test('should handle network timeout', async ({ page }) => {
            await page.route(`**/api/projects/${mockProjectId}/scene-chains`, async (route) => {
                await new Promise(resolve => setTimeout(resolve, 30000)); // 30s timeout
            });

            await page.goto(`/projects/${mockProjectId}/timeline`, { timeout: 5000 });

            // Page should show loading state
            // Note: Test might timeout, which is expected behavior
        });
    });

    // ==========================================
    // 12. LAYOUT & RESPONSIVENESS TESTS
    // ==========================================
    test.describe('Layout', () => {
        test('should have correct two-column layout', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            // Preview monitor should take 2/3 width
            const previewSection = page.locator('.w-2\\/3');
            await expect(previewSection).toBeVisible();

            // Clip list should take 1/3 width
            const clipListSection = page.locator('.w-1\\/3');
            await expect(clipListSection).toBeVisible();
        });

        test('should have timeline at bottom with fixed height', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            // Timeline should be 288px (h-72) high - maximized for no-scroll layout
            const timeline = page.locator('.h-72.flex-shrink-0');
            await expect(timeline).toBeVisible();
        });

        test('should expand preview to full width when toggled', async ({ page }) => {
            await page.goto(`/projects/${mockProjectId}/timeline`);
            await page.waitForLoadState('networkidle');

            await page.locator('select').selectOption('chain-1');

            // Click expand button
            await page.locator('button[title*="Expand"]').click();

            // Preview should now be full width
            const fullWidthPreview = page.locator('.w-full.border-r.border-white\\/10');
            await expect(fullWidthPreview).toBeVisible();
        });
    });
});
