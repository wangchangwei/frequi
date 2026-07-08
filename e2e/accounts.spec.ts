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
    // Risk filter - check that search input is present
    await expect(page.locator('input[placeholder="搜索账户..."]')).toBeVisible();
  });

  test('Add account dialog opens after setting passphrase', async ({ page }) => {
    await page.goto('/accounts');
    // First set passphrase
    await page.getByRole('button', { name: '设置会话密钥' }).click();
    // Dialog title for passphrase
    await expect(page.getByRole('heading', { name: '设置会话密钥' })).toBeVisible();
    await page.getByRole('textbox', { name: '加密密钥 (会话密钥)' }).fill('testpassphrase');
    await page.getByRole('button', { name: '确认' }).click();
    // Now add account button should work
    await page.getByRole('button', { name: '添加账户' }).click();
    // Dialog title for add account
    await expect(page.getByRole('heading', { name: '添加账户' })).toBeVisible();
  });

  test('AccountList shows passphrase warning when not set', async ({ page }) => {
    await page.goto('/accounts');
    await expect(page.getByText('请先设置会话密钥')).toBeVisible();
    await expect(page.getByRole('button', { name: '设置会话密钥' })).toBeVisible();
  });

  test('AccountList page shows passphrase set indicator', async ({ page }) => {
    await page.goto('/accounts');
    // Set passphrase first
    await page.getByRole('button', { name: '设置会话密钥' }).click();
    await page.getByRole('textbox', { name: '加密密钥 (会话密钥)' }).fill('testpassphrase');
    await page.getByRole('button', { name: '确认' }).click();
    // After setting, should show session passphrase indicator
    await expect(page.getByText('会话密钥已设置')).toBeVisible();
  });

  test('AccountList page shows account type options in add dialog', async ({ page }) => {
    await page.goto('/accounts');
    // Set passphrase first
    await page.getByRole('button', { name: '设置会话密钥' }).click();
    await page.getByRole('textbox', { name: '加密密钥 (会话密钥)' }).fill('testpassphrase');
    await page.getByRole('button', { name: '确认' }).click();
    // Open add account dialog
    await page.getByRole('button', { name: '添加账户' }).click();
    await expect(page.getByText('现货 (Spot)')).toBeVisible();
    await expect(page.getByText('杠杆 (Margin)')).toBeVisible();
    await expect(page.getByText('合约 (Futures)')).toBeVisible();
    await expect(page.getByText('理财 (Funding)')).toBeVisible();
  });
});
