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

  test('StrategyList shows search and filter controls', async ({ page }) => {
    await page.goto('/strategies');
    await expect(page.getByPlaceholder('搜索策略...')).toBeVisible();
    await expect(page.getByText('全部')).toBeVisible();
    await expect(page.getByText('低风险')).toBeVisible();
    await expect(page.getByText('中风险')).toBeVisible();
    await expect(page.getByText('高风险')).toBeVisible();
    await expect(page.getByText('极高风险')).toBeVisible();
  });

  test('Add strategy dialog opens with all required fields', async ({ page }) => {
    await page.goto('/strategies');
    await page.getByRole('button', { name: '添加策略' }).click();
    await expect(page.getByText('添加策略')).toBeVisible();
    await expect(page.getByRole('textbox', { name: '策略显示名称' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Freqtrade 策略类名' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '版本号' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '文件 Hash (SHA256)' })).toBeVisible();
    await expect(page.getByRole('button', { name: '取消' })).toBeVisible();
    await expect(page.getByRole('button', { name: '添加' })).toBeVisible();
  });

  test('StrategyList shows risk level options', async ({ page }) => {
    await page.goto('/strategies');
    await expect(page.getByText('低风险')).toBeVisible();
    await expect(page.getByText('中风险')).toBeVisible();
    await expect(page.getByText('高风险')).toBeVisible();
    await expect(page.getByText('极高风险')).toBeVisible();
  });

  test('StrategyList shows initial version info section', async ({ page }) => {
    await page.goto('/strategies');
    await page.getByRole('button', { name: '添加策略' }).click();
    await expect(page.getByText('初始版本信息')).toBeVisible();
    await expect(page.getByText('版本号')).toBeVisible();
    await expect(page.getByText('文件 Hash (SHA256)')).toBeVisible();
    await expect(page.getByText('文件路径')).toBeVisible();
    await expect(page.getByText('参数 (JSON)')).toBeVisible();
  });
});
