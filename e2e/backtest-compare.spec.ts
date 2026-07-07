import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('BacktestCompare', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('BacktestComparison page loads with header', async ({ page }) => {
    await page.goto('/backtest/compare');
    await expect(page.getByRole('heading', { name: '回测比较' })).toBeVisible();
  });

  test('BacktestComparison shows metric comparison table', async ({ page }) => {
    await page.goto('/backtest/compare');
    await expect(page.getByText('Total Profit')).toBeVisible();
    await expect(page.getByText('Profit %')).toBeVisible();
    await expect(page.getByText('Annual Return')).toBeVisible();
    await expect(page.getByText('Max Drawdown')).toBeVisible();
    await expect(page.getByText('Win Rate')).toBeVisible();
    await expect(page.getByText('Profit Factor')).toBeVisible();
    await expect(page.getByText('Trade Count')).toBeVisible();
  });

  test('BacktestComparison shows equity curve chart section', async ({ page }) => {
    await page.goto('/backtest/compare');
    await expect(page.getByText('权益曲线')).toBeVisible();
  });

  test('BacktestComparison shows back to jobs button', async ({ page }) => {
    await page.goto('/backtest/compare');
    await expect(page.getByRole('button', { name: '返回任务列表' })).toBeVisible();
  });

  test('BacktestComparison shows no results message when empty', async ({ page }) => {
    await page.goto('/backtest/compare');
    await expect(page.getByText('请选择至少2个回测结果进行比较')).toBeVisible();
  });

  test('BacktestComparison shows best/worst pair metrics', async ({ page }) => {
    await page.goto('/backtest/compare');
    await expect(page.getByText('Best Pair')).toBeVisible();
    await expect(page.getByText('Worst Pair')).toBeVisible();
    await expect(page.getByText('Capital Utilization')).toBeVisible();
  });
});
