import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('Pairlists', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    page.route('**/pairlists/available', (route) => {
      route.fulfill({ json: [] });
    });
    await setLoginInfo(page);
  });

  test('Pairlists page loads', async ({ page }) => {
    await page.goto('/pairlists');
    await expect(page.getByRole('main')).toBeVisible();
  });
});
