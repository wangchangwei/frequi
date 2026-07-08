import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('Audit', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('AuditCenter page loads with header', async ({ page }) => {
    await page.goto('/audit');
    await expect(page.getByRole('heading', { name: '审计中心' })).toBeVisible();
  });

  test('AuditCenter shows tab navigation', async ({ page }) => {
    await page.goto('/audit');
    await expect(page.getByRole('tab', { name: '交易审计 (Trade Audit)' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '每日收益 (Daily P&L)' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '审计日志 (Audit Log)' })).toBeVisible();
  });

  test('AuditCenter trade tab shows filter labels', async ({ page }) => {
    await page.goto('/audit');
    await page.getByRole('tab', { name: '交易审计 (Trade Audit)' }).click();
    await expect(page.getByText('开始日期 (From)').first()).toBeVisible();
    await expect(page.getByText('结束日期 (To)').first()).toBeVisible();
    await expect(page.getByText('交易对 (Pair)').first()).toBeVisible();
    await expect(page.getByText('状态 (Status)').first()).toBeVisible();
  });

  test('AuditCenter trade tab shows apply button', async ({ page }) => {
    await page.goto('/audit');
    await page.getByRole('tab', { name: '交易审计 (Trade Audit)' }).click();
    await expect(page.getByRole('button', { name: '应用 (Apply)' })).toBeVisible();
  });

  test('AuditCenter trade tab shows export button', async ({ page }) => {
    await page.goto('/audit');
    await page.getByRole('tab', { name: '交易审计 (Trade Audit)' }).click();
    await expect(page.getByRole('button', { name: '导出 CSV (Export CSV)' })).toBeVisible();
  });

  test('AuditCenter log tab shows log filter checkboxes', async ({ page }) => {
    await page.goto('/audit');
    await page.getByRole('tab', { name: '审计日志 (Audit Log)' }).click();
    await expect(page.getByText('级别 (Level)').first()).toBeVisible();
    await expect(page.getByText('类别 (Category)').first()).toBeVisible();
  });

  test('AuditCenter P&L tab shows daily breakdown section', async ({ page }) => {
    await page.goto('/audit');
    await page.getByRole('tab', { name: '每日收益 (Daily P&L)' }).click();
    await expect(page.getByText('每日明细 (Daily Breakdown)').first()).toBeVisible();
  });
});
