import { test, expect } from '@playwright/test';

test.describe('Tesla SEI Visualizer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should show the landing page with dropzone', async ({ page }) => {
        await expect(page.locator('h3')).toContainText('Upload Tesla Dashcam Clip');
        await expect(page.locator('text=Drag and drop your .mp4 file here')).toBeVisible();
    });

    test('should have a working file input', async ({ page }) => {
        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).toBeAttached();
    });
});
