import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('Risk', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('RiskDashboard page loads with header', async ({ page }) => {
    await page.goto('/risk');
    await expect(page.getByRole('heading', { name: '风险管理' })).toBeVisible();
  });

  test('RiskDashboard shows scope filter tabs', async ({ page }) => {
    await page.goto('/risk');
    await expect(page.getByText('全部')).toBeVisible();
    await expect(page.getByText('机器人')).toBeVisible();
    await expect(page.getByText('账户')).toBeVisible();
    await expect(page.getByText('币种')).toBeVisible();
    await expect(page.getByText('市场')).toBeVisible();
  });

  test('RiskDashboard shows summary cards', async ({ page }) => {
    await page.goto('/risk');
    await expect(page.getByText('告警规则')).toBeVisible();
    await expect(page.getByText('活跃事件')).toBeVisible();
    await expect(page.getByText('今日触发')).toBeVisible();
    await expect(page.getByText('暴露超限')).toBeVisible();
  });

  test('RiskDashboard shows rules table with columns', async ({ page }) => {
    await page.goto('/risk');
    await expect(page.getByText('规则名称')).toBeVisible();
    await expect(page.getByText('作用域')).toBeVisible();
    await expect(page.getByText('条件')).toBeVisible();
    await expect(page.getByText('阈值')).toBeVisible();
    await expect(page.getByText('动作')).toBeVisible();
    await expect(page.getByText('启用')).toBeVisible();
    await expect(page.getByText('操作')).toBeVisible();
  });

  test('Add rule dialog opens', async ({ page }) => {
    await page.goto('/risk');
    await page.getByRole('button', { name: '添加规则' }).click();
    await expect(page.getByText('添加风险规则')).toBeVisible();
    await expect(page.getByText('规则名称')).toBeVisible();
    await expect(page.getByText('作用域')).toBeVisible();
    await expect(page.getByText('条件')).toBeVisible();
  });

  test('RiskDashboard shows action type options', async ({ page }) => {
    await page.goto('/risk');
    await page.getByRole('button', { name: '添加规则' }).click();
    await expect(page.getByText('停止买入 (Stop Buy)')).toBeVisible();
    await expect(page.getByText('暂停 (Pause)')).toBeVisible();
    await expect(page.getByText('强制平仓 (Force Exit)')).toBeVisible();
    await expect(page.getByText('黑名单 (Blacklist)')).toBeVisible();
    await expect(page.getByText('锁定交易对 (Lock Pair)')).toBeVisible();
    await expect(page.getByText('重启 (Restart)')).toBeVisible();
    await expect(page.getByText('告警 (Alert)')).toBeVisible();
  });
});
