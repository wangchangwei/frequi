import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('BotRegistry', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
    // Mock bot registry API so dialog opens properly
    page.route('**/api/v1/bot-registry**', (route) => {
      return route.fulfill({ path: './e2e/testData/bot_registry.json' });
    });
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
    // Check that the form has the bot name field label
    await expect(page.getByText('机器人名称').first()).toBeVisible();
  });
});
