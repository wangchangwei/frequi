import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('Logs', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    page.route('**/api/v1/logs', (route) => {
      route.fulfill({ json: [] });
    });
    await setLoginInfo(page);
  });

  test('Logs page loads', async ({ page }) => {
    await page.goto('/logs');
    await expect(page.getByRole('main')).toBeVisible();
  });
});
