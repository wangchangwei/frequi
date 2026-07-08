import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

// Tests the old download data page
// NavBar link is "下载数据" — page is a thin wrapper around DownloadDataMain
test.describe('Download Data View', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    page.route('**/api/v1/show_config', (route) => {
      return route.fulfill({ path: './e2e/testData/show_config.json' });
    });
    page.route('**/api/v1/download_data', (route) => {
      route.fulfill({ json: [] });
    });
    await setLoginInfo(page);
  });

  test('Download Data page loads', async ({ page }) => {
    await page.goto('/download_data');
    // Page renders without crash
    await expect(page.getByRole('main')).toBeVisible();
  });
});
