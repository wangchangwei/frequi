import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('BacktestQueue', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('BacktestJobQueue page loads with header', async ({ page }) => {
    await page.goto('/backtest-jobs');
    await expect(page.getByRole('heading', { name: '回测中心' })).toBeVisible();
  });

  test('BacktestJobQueue shows create job button', async ({ page }) => {
    await page.goto('/backtest-jobs');
    await expect(page.getByRole('button', { name: '新建回测任务' })).toBeVisible();
  });

  test('BacktestJobQueue shows job queue section', async ({ page }) => {
    await page.goto('/backtest-jobs');
    await expect(page.getByText('任务队列').first()).toBeVisible();
  });

  test('BacktestJobQueue shows results history section', async ({ page }) => {
    await page.goto('/backtest-jobs');
    await expect(page.getByText('结果历史').first()).toBeVisible();
  });
});
