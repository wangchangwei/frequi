import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

// Settings page — NavBar menuitem "Settings" → /settings
test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('Settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('main')).toBeVisible();
  });
});
