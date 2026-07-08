import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('Accounts', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('AccountList page loads with header and empty state', async ({ page }) => {
    await page.goto('/accounts');
    await expect(page.getByRole('heading', { name: '账户管理' })).toBeVisible();
    await expect(page.getByText('暂无账户')).toBeVisible();
    await expect(page.getByRole('button', { name: '设置会话密钥' })).toBeVisible();
    await expect(page.getByRole('button', { name: '添加账户' })).toBeVisible();
  });

  test('AccountList shows search and filter controls', async ({ page }) => {
    await page.goto('/accounts');
    await expect(page.getByPlaceholder('搜索账户...')).toBeVisible();
    await expect(page.locator('input[placeholder="搜索账户..."]')).toBeVisible();
  });

  test('AccountList shows passphrase warning when not set', async ({ page }) => {
    await page.goto('/accounts');
    await expect(page.getByText('请先设置会话密钥')).toBeVisible();
    await expect(page.getByRole('button', { name: '设置会话密钥' })).toBeVisible();
  });

  test('Add account button is visible', async ({ page }) => {
    await page.goto('/accounts');
    await expect(page.getByRole('button', { name: '添加账户' })).toBeVisible();
  });
});
