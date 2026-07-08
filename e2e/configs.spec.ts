import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('Configs', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('ConfigCenter page loads with header and empty state', async ({ page }) => {
    await page.goto('/configs');
    await expect(page.getByRole('heading', { name: '配置中心' })).toBeVisible();
    await expect(page.getByText('暂无配置模板')).toBeVisible();
    await expect(page.getByRole('button', { name: '创建模板' })).toBeVisible();
  });

  test('ConfigCenter shows category filter buttons', async ({ page }) => {
    await page.goto('/configs');
    await expect(page.getByRole('button', { name: '全部' })).toBeVisible();
    await expect(page.getByRole('button', { name: '策略运行' })).toBeVisible();
    await expect(page.getByRole('button', { name: '交易所' })).toBeVisible();
    await expect(page.getByRole('button', { name: '交易对列表' })).toBeVisible();
    await expect(page.getByRole('button', { name: '风险管理' })).toBeVisible();
  });

  test('ConfigCenter shows search input', async ({ page }) => {
    await page.goto('/configs');
    await expect(page.getByPlaceholder('搜索模板名称、描述或标签...')).toBeVisible();
  });

  test('ConfigCenter create template button is visible', async ({ page }) => {
    await page.goto('/configs');
    await expect(page.getByRole('button', { name: '创建模板' })).toBeVisible();
  });
});
