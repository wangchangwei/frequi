import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('Strategies', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('StrategyList page loads with header and empty state', async ({ page }) => {
    await page.goto('/strategies');
    await expect(page.getByRole('heading', { name: '策略管理' })).toBeVisible();
    await expect(page.getByText('暂无策略')).toBeVisible();
    await expect(page.getByRole('button', { name: '添加策略' })).toBeVisible();
  });

  test('StrategyList shows search input', async ({ page }) => {
    await page.goto('/strategies');
    await expect(page.getByPlaceholder('搜索策略...')).toBeVisible();
  });

  test('StrategyList add strategy button is visible', async ({ page }) => {
    await page.goto('/strategies');
    await expect(page.getByRole('button', { name: '添加策略' })).toBeVisible();
  });
});
