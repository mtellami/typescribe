import { test, expect } from '@playwright/test';

test.describe('Gloomtype E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('idle screen shows hero and select video button', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Type along with the video');
    await expect(
      page.getByRole('button', { name: 'Select a video' }).first(),
    ).toBeVisible();
    await expect(page.locator('text=No videos yet')).toBeVisible();
  });

  test('opens select video dialog on button click', async ({ page }) => {
    await page.getByRole('button', { name: 'Select a video' }).first().click();
    await expect(
      page.getByRole('heading', { name: 'Select a video' }),
    ).toBeVisible();
    await expect(page.locator('text=Paste a YouTube link')).toBeVisible();
  });

  test('dialog has import URL input', async ({ page }) => {
    await page.getByRole('button', { name: 'Select a video' }).first().click();
    await expect(page.locator('input[type="url"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
  });

  test('dialog shows featured videos grid when available', async ({ page }) => {
    await page.getByRole('button', { name: 'Select a video' }).first().click();
    const grid = page.locator('ul.grid');
    await expect(grid).toBeVisible();
  });

  test('keyboard shortcuts: Tab replays segment when session active', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Select a video' }).first().click();
    await page.fill(
      'input[type="url"]',
      'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    );
    await page.getByRole('button', { name: 'Import' }).click();
    await page.waitForTimeout(5000);
    await page.keyboard.press('Tab');
    await expect(page.locator('text=Segment 1')).toBeVisible({
      timeout: 10000,
    });
  });

  test('error state handling for invalid URL', async ({ page }) => {
    await page.getByRole('button', { name: 'Select a video' }).first().click();
    await page.fill(
      'input[type="url"]',
      'https://www.youtube.com/watch?v=invalid',
    );
    await page.getByRole('button', { name: 'Import' }).click();
    await expect(page.locator('text=Could not import')).toBeVisible({
      timeout: 15000,
    });
  });
});
