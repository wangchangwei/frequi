import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('BotRegistry', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('BotRegistry page loads with header and empty state', async ({ page }) => {
    await page.goto('/bots');
    await expect(page.getByRole('heading', { name: '机器人注册表' })).toBeVisible();
    await expect(page.getByText('暂无机器人')).toBeVisible();
    await expect(page.getByRole('button', { name: '添加机器人' })).toBeVisible();
  });

  test('BotRegistry page shows filters and add button', async ({ page }) => {
    await page.goto('/bots');
    await expect(page.getByRole('heading', { name: '机器人注册表' })).toBeVisible();
    await expect(page.getByPlaceholder('搜索机器人...')).toBeVisible();
    await expect(page.getByRole('button', { name: '刷新健康检查' })).toBeVisible();
  });

  test('Add robot button is visible', async ({ page }) => {
    await page.goto('/bots');
    await expect(page.getByRole('button', { name: '添加机器人' })).toBeVisible();
  });
});
