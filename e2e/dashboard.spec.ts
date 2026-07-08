import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks, tradeMocks } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await tradeMocks(page);
    await setLoginInfo(page);
  });
  test('Dashboard Page', async ({ page }) => {
    await Promise.all([
      page.goto('/dashboard'),
      page.waitForResponse('**/status'),
      page.waitForResponse('**/profit'),
      page.waitForResponse('**/balance'),
      // page.waitForResponse('**/trades'),
      page.waitForResponse('**/whitelist'),
      page.waitForResponse('**/blacklist'),
      page.waitForResponse('**/locks'),
    ]);
    await expect(page.locator('.drag-header', { hasText: '机器人对比' })).toBeVisible();
    await expect(page.locator('.drag-header', { hasText: '机器人对比' })).toBeInViewport();
    await expect(page.locator('.drag-header', { hasText: 'Profit over time' })).toBeVisible();
    await expect(page.locator('.drag-header', { hasText: 'Profit over time' })).toBeInViewport();
    await expect(page.locator('.drag-header', { hasText: '未平仓位' })).toBeVisible();
    await expect(page.locator('.drag-header', { hasText: '未平仓位' })).toBeInViewport();
    await expect(page.locator('.drag-header', { hasText: '累计收益' })).toBeVisible();
    await expect(page.locator('.drag-header', { hasText: '累计收益' })).toBeInViewport();

    await expect(page.locator('span').filter({ hasText: /^TestBot$/ })).toBeVisible();
    await expect(page.locator('span', { hasText: 'Summary' })).toBeVisible();
    // Scroll to bottom
    await page.locator('.drag-header', { hasText: 'Trades Log' }).scrollIntoViewIfNeeded();
    await expect(page.locator('.drag-header', { hasText: '已平仓位' })).toBeInViewport();
    await expect(page.locator('.drag-header', { hasText: 'Profit Distribution' })).toBeInViewport();

    await expect(page.locator('.drag-header', { hasText: 'Trades Log' })).toBeInViewport();
  });
});
