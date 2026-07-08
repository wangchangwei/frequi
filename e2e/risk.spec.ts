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
    await expect(page.getByText('全部').first()).toBeVisible();
    await expect(page.getByText('机器人').first()).toBeVisible();
    await expect(page.getByText('账户').first()).toBeVisible();
    await expect(page.getByText('币种').first()).toBeVisible();
    await expect(page.getByText('市场').first()).toBeVisible();
  });

  test('RiskDashboard shows summary card labels', async ({ page }) => {
    await page.goto('/risk');
    await expect(page.getByText('活跃规则').first()).toBeVisible();
    await expect(page.getByText('活跃事件').first()).toBeVisible();
    await expect(page.getByText('今日触发').first()).toBeVisible();
    await expect(page.getByText('暴露仓位').first()).toBeVisible();
  });

  test('RiskDashboard shows add rule button', async ({ page }) => {
    await page.goto('/risk');
    await expect(page.getByRole('button', { name: '添加规则' })).toBeVisible();
  });
});
