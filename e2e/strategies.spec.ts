import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('Strategies', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
    // Mock strategies API
    page.route('**/api/v1/strategies**', (route) => {
      return route.fulfill({ path: './e2e/testData/strategies.json' });
    });
  });

  test('StrategyList page loads with header and empty state', async ({ page }) => {
    await page.goto('/strategies');
    await expect(page.getByRole('heading', { name: '策略管理' })).toBeVisible();
    await expect(page.getByText('暂无策略')).toBeVisible();
    await expect(page.getByRole('button', { name: '添加策略' })).toBeVisible();
  });

  test('StrategyList shows search and filter controls', async ({ page }) => {
    await page.goto('/strategies');
    await expect(page.getByPlaceholder('搜索策略...')).toBeVisible();
    // The "全部" text is in the risk filter USelect - check by partial match in the select
    await expect(page.locator('.w-36').filter({ hasText: '全部' }).first()).toBeVisible();
  });

  test('Add strategy dialog opens with all required fields', async ({ page }) => {
    await page.goto('/strategies');
    await page.getByRole('button', { name: '添加策略' }).click();
    await expect(page.getByRole('heading', { name: '添加策略' })).toBeVisible();
    await expect(page.getByText('策略显示名称').first()).toBeVisible();
    await expect(page.getByText('Freqtrade 策略类名').first()).toBeVisible();
  });

  test('StrategyList shows initial version info section', async ({ page }) => {
    await page.goto('/strategies');
    await page.getByRole('button', { name: '添加策略' }).click();
    // The initial version info section
    await expect(page.getByText('初始版本信息')).toBeVisible();
    await expect(page.getByText('版本号').first()).toBeVisible();
    await expect(page.getByText('文件 Hash (SHA256)').first()).toBeVisible();
  });
});
