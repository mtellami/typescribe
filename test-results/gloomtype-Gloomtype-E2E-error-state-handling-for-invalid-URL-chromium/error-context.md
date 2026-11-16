# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gloomtype.spec.ts >> Gloomtype E2E >> error state handling for invalid URL
- Location: tests/e2e/gloomtype.spec.ts:54:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Could not import')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=Could not import') with timeout 15000ms
  - waiting for locator('text=Could not import')

```

```yaml
- region "Notifications alt+T"
- dialog "Select a video":
  - heading "Select a video" [level=2]
  - text: Paste a YouTube link
  - textbox "Paste a YouTube link":
    - /placeholder: https://www.youtube.com/watch?v=...
    - text: https://www.youtube.com/watch?v=invalid
  - button "Import"
  - status: Could not find a YouTube video ID in that URL.
  - list:
    - listitem:
      - button "Fixture Video Gloomtype Tests":
        - paragraph: Fixture Video
        - paragraph: Gloomtype Tests
  - button "Close"
  - button "Close"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Gloomtype E2E', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/');
  6  |     await page.waitForLoadState('networkidle');
  7  |   });
  8  | 
  9  |   test('idle screen shows hero and select video button', async ({ page }) => {
  10 |     await expect(page.locator('h2')).toContainText('Type along with the video');
  11 |     await expect(
  12 |       page.getByRole('button', { name: 'Select a video' }).first(),
  13 |     ).toBeVisible();
  14 |     await expect(page.locator('text=No videos yet')).toBeVisible();
  15 |   });
  16 | 
  17 |   test('opens select video dialog on button click', async ({ page }) => {
  18 |     await page.getByRole('button', { name: 'Select a video' }).first().click();
  19 |     await expect(
  20 |       page.getByRole('heading', { name: 'Select a video' }),
  21 |     ).toBeVisible();
  22 |     await expect(page.locator('text=Paste a YouTube link')).toBeVisible();
  23 |   });
  24 | 
  25 |   test('dialog has import URL input', async ({ page }) => {
  26 |     await page.getByRole('button', { name: 'Select a video' }).first().click();
  27 |     await expect(page.locator('input[type="url"]')).toBeVisible();
  28 |     await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
  29 |   });
  30 | 
  31 |   test('dialog shows featured videos grid when available', async ({ page }) => {
  32 |     await page.getByRole('button', { name: 'Select a video' }).first().click();
  33 |     const grid = page.locator('ul.grid');
  34 |     await expect(grid).toBeVisible();
  35 |   });
  36 | 
  37 |   test('toolbar shows practice mode selector', async ({ page }) => {
  38 |     await page.getByRole('button', { name: 'Select a video' }).first().click();
  39 |     await page.getByRole('button', { name: 'Import' }).click();
  40 |     await page.waitForTimeout(2000);
  41 |     await expect(
  42 |       page.locator('select[aria-label="Practice mode"]'),
  43 |     ).toBeVisible();
  44 |   });
  45 | 
  46 |   test('keyboard shortcuts: Tab replays segment', async ({ page }) => {
  47 |     await page.getByRole('button', { name: 'Select a video' }).first().click();
  48 |     await page.getByRole('button', { name: 'Import' }).click();
  49 |     await page.waitForTimeout(2000);
  50 |     await page.keyboard.press('Tab');
  51 |     await expect(page.locator('text=Segment 1')).toBeVisible({ timeout: 5000 });
  52 |   });
  53 | 
  54 |   test('error state handling for invalid URL', async ({ page }) => {
  55 |     await page.getByRole('button', { name: 'Select a video' }).first().click();
  56 |     await page.fill(
  57 |       'input[type="url"]',
  58 |       'https://www.youtube.com/watch?v=invalid',
  59 |     );
  60 |     await page.getByRole('button', { name: 'Import' }).click();
> 61 |     await expect(page.locator('text=Could not import')).toBeVisible({
     |                                                         ^ Error: expect(locator).toBeVisible() failed
  62 |       timeout: 15000,
  63 |     });
  64 |   });
  65 | });
  66 | 
```