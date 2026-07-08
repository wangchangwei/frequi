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

  test('Add robot dialog opens and has required fields', async ({ page }) => {
    await page.goto('/bots');
    await page.getByRole('button', { name: '添加机器人' }).click();
    await expect(page.getByRole('heading', { name: '添加机器人' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '机器人名称' })).toBeVisible();
  });

  test('BotRegistry page has status filter select', async ({ page }) => {
    await page.goto('/bots');
    // Status filter USelect dropdown trigger (shows current value)
    await expect(page.locator('.w-64').filter({ hasText: '全部' }).first()).toBeVisible();
  });

  test('BotRegistry page has mode filter with Dry-run option', async ({ page }) => {
    await page.goto('/bots');
    // Mode filter shows Dry-run by default
    await expect(page.locator('[data-slot="base"]').filter({ hasText: '模拟交易' }).first()).toBeVisible();
  });
});
