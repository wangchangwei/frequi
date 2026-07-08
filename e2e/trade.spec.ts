import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

// Tests the old Trade page — heavy dashboard with panels
// This is Phase 1-era; NavBar route is /trade
test.describe('Trade', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    page.route('**/api/v1/show_config', (route) => {
      return route.fulfill({ path: './e2e/testData/show_config.json' });
    });
    await setLoginInfo(page);
  });

  test('Trade page loads', async ({ page }) => {
    await page.goto('/trade');
    // Page loads without crash — panels may or may not render with empty state
    await expect(page.getByRole('main')).toBeVisible();
  });
});
