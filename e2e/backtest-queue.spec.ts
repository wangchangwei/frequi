import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('BacktestQueue', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('BacktestJobQueue page loads with header', async ({ page }) => {
    await page.goto('/backtest/queue');
    await expect(page.getByRole('heading', { name: '回测任务队列' })).toBeVisible();
  });

  test('BacktestJobQueue shows create job button', async ({ page }) => {
    await page.goto('/backtest/queue');
    await expect(page.getByRole('button', { name: '创建回测任务' })).toBeVisible();
  });

  test('BacktestJobQueue shows job table columns', async ({ page }) => {
    await page.goto('/backtest/queue');
    await expect(page.getByText('任务名称')).toBeVisible();
    await expect(page.getByText('策略')).toBeVisible();
    await expect(page.getByText('交易对')).toBeVisible();
    await expect(page.getByText('时间范围')).toBeVisible();
    await expect(page.getByText('状态')).toBeVisible();
    await expect(page.getByText('开始时间')).toBeVisible();
    await expect(page.getByText('完成时间')).toBeVisible();
    await expect(page.getByText('选择')).toBeVisible();
  });

  test('Create backtest job dialog opens', async ({ page }) => {
    await page.goto('/backtest/queue');
    await page.getByRole('button', { name: '创建回测任务' }).click();
    await expect(page.getByText('创建回测任务')).toBeVisible();
    await expect(page.getByText('任务名称')).toBeVisible();
    await expect(page.getByText('策略')).toBeVisible();
    await expect(page.getByText('交易对')).toBeVisible();
    await expect(page.getByText('时间周期')).toBeVisible();
  });

  test('BacktestJobQueue shows status badge options', async ({ page }) => {
    await page.goto('/backtest/queue');
    await expect(page.getByText('排队中')).toBeVisible();
    await expect(page.getByText('运行中')).toBeVisible();
    await expect(page.getByText('已完成')).toBeVisible();
    await expect(page.getByText('失败')).toBeVisible();
  });

  test('BacktestJobQueue shows time range presets', async ({ page }) => {
    await page.goto('/backtest/queue');
    await page.getByRole('button', { name: '创建回测任务' }).click();
    await expect(page.getByRole('button', { name: '近30天' })).toBeVisible();
    await expect(page.getByRole('button', { name: '近3个月' })).toBeVisible();
    await expect(page.getByRole('button', { name: '近6个月' })).toBeVisible();
    await expect(page.getByRole('button', { name: '近1年' })).toBeVisible();
  });

  test('BacktestJobQueue shows results history section', async ({ page }) => {
    await page.goto('/backtest/queue');
    await expect(page.getByText('历史结果')).toBeVisible();
    await expect(page.getByRole('button', { name: '开始比较' })).toBeVisible();
  });
});
