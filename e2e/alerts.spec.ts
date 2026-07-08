import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('Alerts', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('AlertCenter page loads with header', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.getByRole('heading', { name: '告警中心' })).toBeVisible();
  });

  test('AlertCenter shows alert rules section', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.getByText('告警规则').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '添加告警规则' })).toBeVisible();
  });

  test('AlertCenter shows recent alerts history section', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.getByText('最近告警').first()).toBeVisible();
  });

  test('AlertCenter shows test alert section', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.getByText('发送测试告警').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '发送' }).first()).toBeVisible();
  });

  test('Add alert rule button is visible', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.getByRole('button', { name: '添加告警规则' })).toBeVisible();
  });
});
