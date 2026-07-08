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
    await expect(page.getByText('策略 (Strategy)').first()).toBeVisible();
  });

  test('Hyperopt shows loss function selector', async ({ page }) => {
    await page.goto('/hyperopt');
    await expect(page.getByText('Loss Function').first()).toBeVisible();
  });

  test('Hyperopt shows spaces section', async ({ page }) => {
    await page.goto('/hyperopt');
    await expect(page.getByText('Spaces (优化空间)').first()).toBeVisible();
  });

  test('Hyperopt shows epochs input', async ({ page }) => {
    await page.goto('/hyperopt');
    await expect(page.getByText('Epochs').first()).toBeVisible();
  });

  test('Hyperopt shows start button', async ({ page }) => {
    await page.goto('/hyperopt');
    await expect(page.getByRole('button', { name: '开始优化 (Start Hyperopt)' })).toBeVisible();
  });

  test('Hyperopt shows results section', async ({ page }) => {
    await page.goto('/hyperopt');
    await expect(page.getByText('优化结果 (Results)').first()).toBeVisible();
  });

  test('Hyperopt shows history section', async ({ page }) => {
    await page.goto('/hyperopt');
    await expect(page.getByText('历史记录 (History)').first()).toBeVisible();
  });
});
