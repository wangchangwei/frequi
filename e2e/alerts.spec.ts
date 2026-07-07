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
    await expect(page.getByText('告警规则')).toBeVisible();
    await expect(page.getByRole('button', { name: '添加规则' })).toBeVisible();
  });

  test('AlertCenter shows rules table columns', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.getByText('规则名称')).toBeVisible();
    await expect(page.getByText('级别')).toBeVisible();
    await expect(page.getByText('频道')).toBeVisible();
    await expect(page.getByText('目标')).toBeVisible();
    await expect(page.getByText('启用')).toBeVisible();
    await expect(page.getByText('操作')).toBeVisible();
  });

  test('Add alert rule dialog opens', async ({ page }) => {
    await page.goto('/alerts');
    await page.getByRole('button', { name: '添加规则' }).click();
    await expect(page.getByText('添加告警规则')).toBeVisible();
    await expect(page.getByText('规则名称')).toBeVisible();
    await expect(page.getByText('级别')).toBeVisible();
    await expect(page.getByText('频道')).toBeVisible();
  });

  test('AlertCenter shows alert level options', async ({ page }) => {
    await page.goto('/alerts');
    await page.getByRole('button', { name: '添加规则' }).click();
    await expect(page.getByText('信息 (Info)')).toBeVisible();
    await expect(page.getByText('警告 (Warning)')).toBeVisible();
    await expect(page.getByText('严重 (Critical)')).toBeVisible();
  });

  test('AlertCenter shows alert channel options', async ({ page }) => {
    await page.goto('/alerts');
    await page.getByRole('button', { name: '添加规则' }).click();
    await expect(page.getByText('Telegram')).toBeVisible();
    await expect(page.getByText('Webhook')).toBeVisible();
    await expect(page.getByText('Email')).toBeVisible();
    await expect(page.getByText('应用内')).toBeVisible();
  });

  test('AlertCenter shows recent alerts history section', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.getByText('最近告警')).toBeVisible();
  });

  test('AlertCenter shows test alert section', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.getByText('发送测试告警')).toBeVisible();
    await expect(page.getByRole('button', { name: '发送' })).toBeVisible();
  });
});
