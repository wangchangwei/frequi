import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('Audit', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
    // Mock audit API endpoints
    page.route('**/api/v1/audit/trades**', (route) => {
      return route.fulfill({ path: './e2e/testData/audit_trades.json' });
    });
    page.route('**/api/v1/audit/pnl**', (route) => {
      return route.fulfill({ path: './e2e/testData/audit_pnl.json' });
    });
    page.route('**/api/v1/audit/logs**', (route) => {
      return route.fulfill({ path: './e2e/testData/audit_logs.json' });
    });
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
    await expect(page.getByText('开始日期 (From)').first()).toBeVisible();
    await expect(page.getByText('结束日期 (To)').first()).toBeVisible();
    await expect(page.getByText('交易对 (Pair)').first()).toBeVisible();
    await expect(page.getByText('状态 (Status)').first()).toBeVisible();
    await expect(page.getByText('全部 (All)').first()).toBeVisible();
    await expect(page.getByText('进行中 (Open)').first()).toBeVisible();
    await expect(page.getByText('已平仓 (Closed)').first()).toBeVisible();
  });

  test('AuditCenter trade tab shows table columns', async ({ page }) => {
    await page.goto('/audit');
    await page.getByRole('tab', { name: '交易审计 (Trade Audit)' }).click();
    await expect(page.getByRole('columnheader', { name: 'ID' })).toBeVisible();
    await expect(page.getByText('日期 (Date)').first()).toBeVisible();
    await expect(page.getByText('交易对 (Pair)').first()).toBeVisible();
    await expect(page.getByText('方向 (Side)').first()).toBeVisible();
    await expect(page.getByText('开仓价 (Entry)').first()).toBeVisible();
    await expect(page.getByText('平仓价 (Exit)').first()).toBeVisible();
    await expect(page.getByText('保证金 (Stake)').first()).toBeVisible();
    await expect(page.getByText('收益率 % (Profit%)').first()).toBeVisible();
    await expect(page.getByText('状态 (Status)').first()).toBeVisible();
  });

  test('AuditCenter log tab shows log filters', async ({ page }) => {
    await page.goto('/audit');
    await page.getByRole('tab', { name: '审计日志 (Audit Log)' }).click();
    await expect(page.getByText('信息 (Info)').first()).toBeVisible();
    await expect(page.getByText('警告 (Warning)').first()).toBeVisible();
    await expect(page.getByText('错误 (Error)').first()).toBeVisible();
  });

  test('AuditCenter P&L tab shows daily breakdown', async ({ page }) => {
    await page.goto('/audit');
    await page.getByRole('tab', { name: '每日收益 (Daily P&L)' }).click();
    await expect(page.getByText('每日明细 (Daily Breakdown)').first()).toBeVisible();
  });

  test('AuditCenter shows export button in trade tab', async ({ page }) => {
    await page.goto('/audit');
    await page.getByRole('tab', { name: '交易审计 (Trade Audit)' }).click();
    await expect(page.getByRole('button', { name: '导出 CSV (Export CSV)' })).toBeVisible();
  });
});
