import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

// Tests the OLD /backtest page (Phase 1 backtest — separate from /backtest-jobs queue)
// NavBar has "回测" link to /backtest
test.describe('Backtesting', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    page.route('**/api/v1/show_config', (route) => {
      return route.fulfill({ path: './e2e/testData/show_config.json' });
    });
    page.route('**/api/v1/strategies', (route) => {
      return route.fulfill({ json: [] });
    });
    page.route('**/api/v1/backtest', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({ json: {} });
      } else {
        route.fulfill({ json: [] });
      }
    });
    await setLoginInfo(page);
  });

  test('Backtest page loads', async ({ page }) => {
    await page.goto('/backtest');
    // Page loads without crash — header/title may be in Chinese
    await expect(page.getByRole('main')).toBeVisible();
  });
});
