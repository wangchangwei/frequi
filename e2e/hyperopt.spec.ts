import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('Hyperopt', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('Hyperopt page loads with header', async ({ page }) => {
    await page.goto('/hyperopt');
    await expect(page.getByRole('heading', { name: 'Hyperopt' })).toBeVisible();
  });

  test('Hyperopt shows strategy selector', async ({ page }) => {
    await page.goto('/hyperopt');
    await expect(page.getByText('选择策略')).toBeVisible();
    await expect(page.getByText('选择 Loss Function')).toBeVisible();
  });

  test('Hyperopt shows space checkboxes', async ({ page }) => {
    await page.goto('/hyperopt');
    await expect(page.getByText('优化空间')).toBeVisible();
    await expect(page.getByText('all')).toBeVisible();
  });

  test('Hyperopt shows epochs input', async ({ page }) => {
    await page.goto('/hyperopt');
    await expect(page.getByText('Epochs')).toBeVisible();
    await expect(page.getByText('时间范围')).toBeVisible();
  });

  test('Hyperopt shows start and stop buttons', async ({ page }) => {
    await page.goto('/hyperopt');
    await expect(page.getByRole('button', { name: '开始 Hyperopt' })).toBeVisible();
    await expect(page.getByRole('button', { name: '停止 Hyperopt' })).toBeVisible();
  });

  test('Hyperopt shows results table', async ({ page }) => {
    await page.goto('/hyperopt');
    await expect(page.getByText('历史结果')).toBeVisible();
    await expect(page.getByText('策略 (Strategy)')).toBeVisible();
    await expect(page.getByText('Loss Function')).toBeVisible();
    await expect(page.getByText('Best Loss')).toBeVisible();
    await expect(page.getByText('进度 (Progress)')).toBeVisible();
    await expect(page.getByText('状态 (Status)')).toBeVisible();
  });

  test('Hyperopt shows clear results button', async ({ page }) => {
    await page.goto('/hyperopt');
    await expect(page.getByRole('button', { name: '清除结果' })).toBeVisible();
  });

  test('Hyperopt shows loss function options when fetched', async ({ page }) => {
    await page.goto('/hyperopt');
    await page.getByRole('button', { name: '获取 Loss Functions' }).click();
    await expect(page.getByText('Loss Function 列表')).toBeVisible();
  });
});
