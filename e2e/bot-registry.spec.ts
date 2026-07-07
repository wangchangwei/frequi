import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('BotRegistry', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('BotRegistry page loads with header and empty state', async ({ page }) => {
    await page.goto('/bot-registry');
    await expect(page.getByRole('heading', { name: '机器人注册表' })).toBeVisible();
    await expect(page.getByText('暂无机器人')).toBeVisible();
    await expect(page.getByRole('button', { name: '添加机器人' })).toBeVisible();
  });

  test('BotRegistry page shows filters and add button', async ({ page }) => {
    await page.goto('/bot-registry');
    await expect(page.getByPlaceholder('搜索机器人...')).toBeVisible();
    await expect(page.getByRole('button', { name: '刷新健康检查' })).toBeVisible();
  });

  test('Add robot dialog opens and has required fields', async ({ page }) => {
    await page.goto('/bot-registry');
    await page.getByRole('button', { name: '添加机器人' }).click();
    await expect(page.getByText('添加机器人')).toBeVisible();
    await expect(page.getByRole('textbox', { name: '机器人名称' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Bot ID' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '交易所' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'API URL' })).toBeVisible();
    await expect(page.getByRole('button', { name: '取消' })).toBeVisible();
    await expect(page.getByRole('button', { name: '添加' })).toBeVisible();
  });

  test('BotRegistry page shows online offline status filters', async ({ page }) => {
    await page.goto('/bot-registry');
    // Status filter tabs
    await expect(page.getByText('全部')).toBeVisible();
    await expect(page.getByText('在线')).toBeVisible();
    await expect(page.getByText('离线')).toBeVisible();
    await expect(page.getByText('错误')).toBeVisible();
    await expect(page.getByText('未知')).toBeVisible();
  });

  test('BotRegistry page shows mode badges (模拟/实盘)', async ({ page }) => {
    await page.goto('/bot-registry');
    await expect(page.getByText('模拟交易 (Dry-run)')).toBeVisible();
    await expect(page.getByText('实盘 (Live)')).toBeVisible();
  });
});
