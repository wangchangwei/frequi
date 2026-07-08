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
    // Tabs are '交易审计 (Trade Audit)', '每日收益 (Daily P&L)', '审计日志 (Audit Log)'
    await expect(page.getByRole('tab', { name: '交易审计 (Trade Audit)' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '每日收益 (Daily P&L)' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '审计日志 (Audit Log)' })).toBeVisible();
  });

  test('AuditCenter trade tab shows filters', async ({ page }) => {
    await page.goto('/audit');
    await page.getByRole('tab', { name: '交易审计 (Trade Audit)' }).click();
    await expect(page.getByText('开始日期 (From)')).toBeVisible();
    await expect(page.getByText('结束日期 (To)')).toBeVisible();
    await expect(page.getByText('交易对 (Pair)')).toBeVisible();
    await expect(page.getByText('状态 (Status)')).toBeVisible();
    await expect(page.getByText('全部 (All)')).toBeVisible();
    await expect(page.getByText('进行中 (Open)')).toBeVisible();
    await expect(page.getByText('已平仓 (Closed)')).toBeVisible();
  });

  test('AuditCenter trade tab shows table columns', async ({ page }) => {
    await page.goto('/audit');
    await page.getByRole('tab', { name: '交易审计 (Trade Audit)' }).click();
    await expect(page.getByRole('columnheader', { name: 'ID' })).toBeVisible();
    await expect(page.getByText('日期 (Date)')).toBeVisible();
    await expect(page.getByText('交易对 (Pair)')).toBeVisible();
    await expect(page.getByText('方向 (Side)')).toBeVisible();
    await expect(page.getByText('开仓价 (Entry)')).toBeVisible();
    await expect(page.getByText('平仓价 (Exit)')).toBeVisible();
    await expect(page.getByText('保证金 (Stake)')).toBeVisible();
    await expect(page.getByText('收益率 % (Profit%)')).toBeVisible();
    await expect(page.getByText('状态 (Status)')).toBeVisible();
  });

  test('AuditCenter log tab shows log filters', async ({ page }) => {
    await page.goto('/audit');
    await page.getByRole('tab', { name: '审计日志 (Audit Log)' }).click();
    await expect(page.getByText('信息 (Info)')).toBeVisible();
    await expect(page.getByText('警告 (Warning)')).toBeVisible();
    await expect(page.getByText('错误 (Error)')).toBeVisible();
  });

  test('AuditCenter P&L tab shows daily breakdown', async ({ page }) => {
    await page.goto('/audit');
    await page.getByRole('tab', { name: '每日收益 (Daily P&L)' }).click();
    await expect(page.getByText('每日明细 (Daily Breakdown)')).toBeVisible();
  });

  test('AuditCenter shows export button in trade tab', async ({ page }) => {
    await page.goto('/audit');
    await page.getByRole('tab', { name: '交易审计 (Trade Audit)' }).click();
    await expect(page.getByRole('button', { name: '导出 CSV (Export CSV)' })).toBeVisible();
  });
});
