import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('BacktestCompare', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('BacktestComparison page loads with header', async ({ page }) => {
    await page.goto('/backtest-compare');
    await expect(page.getByRole('heading', { name: '回测对比' })).toBeVisible();
  });

  test('BacktestComparison shows back to jobs button', async ({ page }) => {
    await page.goto('/backtest-compare');
    await expect(page.getByRole('button', { name: '返回任务列表' }).first()).toBeVisible();
  });

  test('BacktestComparison shows no results message when empty', async ({ page }) => {
    await page.goto('/backtest-compare');
    await expect(page.getByText('没有选择任何回测结果').first()).toBeVisible();
  });
});
