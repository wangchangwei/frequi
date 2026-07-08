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

  test('AlertCenter shows rules table columns', async ({ page }) => {
    await page.goto('/alerts');
    await expect(page.getByRole('columnheader', { name: '规则名称' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '级别' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '频道' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '目标' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '启用' })).toBeVisible();
  });

  test('Add alert rule dialog opens', async ({ page }) => {
    await page.goto('/alerts');
    await page.getByRole('button', { name: '添加告警规则' }).click();
    await expect(page.getByRole('heading', { name: '添加告警规则' })).toBeVisible();
    await expect(page.getByText('规则名称').first()).toBeVisible();
    await expect(page.getByText('级别').first()).toBeVisible();
    // Use .first() because '频道' appears both as columnheader and as form field label
    await expect(page.getByText('频道').first()).toBeVisible();
  });

  test('AlertCenter shows alert level options', async ({ page }) => {
    await page.goto('/alerts');
    await page.getByRole('button', { name: '添加告警规则' }).click();
    // The level options show labels from labelMap: '信息', '警告', '严重'
    await expect(page.getByText('信息').first()).toBeVisible();
    await expect(page.getByText('警告').first()).toBeVisible();
    await expect(page.getByText('严重').first()).toBeVisible();
  });

  test('AlertCenter shows alert channel options', async ({ page }) => {
    await page.goto('/alerts');
    await page.getByRole('button', { name: '添加告警规则' }).click();
    // The channel options show labels: 'Telegram', 'Webhook', 'Email', '应用内'
    await expect(page.getByText('Telegram').first()).toBeVisible();
    await expect(page.getByText('Webhook').first()).toBeVisible();
    await expect(page.getByText('Email').first()).toBeVisible();
    await expect(page.getByText('应用内').first()).toBeVisible();
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
});
