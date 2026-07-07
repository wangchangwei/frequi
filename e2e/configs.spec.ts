import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('Configs', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('ConfigCenter page loads with header and empty state', async ({ page }) => {
    await page.goto('/configs');
    await expect(page.getByRole('heading', { name: '配置中心' })).toBeVisible();
    await expect(page.getByText('暂无配置模板')).toBeVisible();
    await expect(page.getByRole('button', { name: '创建模板' })).toBeVisible();
  });

  test('ConfigCenter shows category filter tabs', async ({ page }) => {
    await page.goto('/configs');
    await expect(page.getByText('全部')).toBeVisible();
    await expect(page.getByText('策略运行')).toBeVisible();
    await expect(page.getByText('交易所')).toBeVisible();
    await expect(page.getByText('交易对列表')).toBeVisible();
    await expect(page.getByText('风险管理')).toBeVisible();
  });

  test('ConfigCenter shows search input', async ({ page }) => {
    await page.goto('/configs');
    await expect(page.getByPlaceholder('搜索模板名称、描述或标签...')).toBeVisible();
  });

  test('Create template dialog opens with key-value editors', async ({ page }) => {
    await page.goto('/configs');
    await page.getByRole('button', { name: '创建模板' }).click();
    await expect(page.getByText('创建配置模板')).toBeVisible();
    await expect(page.getByRole('textbox', { name: '模板名称' })).toBeVisible();
    await expect(page.getByText('参数 (key-value)')).toBeVisible();
    await expect(page.getByText('Dry-Run 参数')).toBeVisible();
    await expect(page.getByText('实盘参数')).toBeVisible();
  });

  test('ConfigCenter shows template table columns', async ({ page }) => {
    await page.goto('/configs');
    await expect(page.getByText('模板名称')).toBeVisible();
    await expect(page.getByText('分类')).toBeVisible();
    await expect(page.getByText('标签')).toBeVisible();
    await expect(page.getByText('版本数')).toBeVisible();
    await expect(page.getByText('最新版本')).toBeVisible();
    await expect(page.getByText('生产')).toBeVisible();
    await expect(page.getByText('更新时间')).toBeVisible();
    await expect(page.getByText('操作')).toBeVisible();
  });

  test('ConfigCenter category filter tabs are clickable', async ({ page }) => {
    await page.goto('/configs');
    await page.getByRole('button', { name: '策略运行' }).click();
    await page.getByRole('button', { name: '交易所' }).click();
    await page.getByRole('button', { name: '交易对列表' }).click();
    await page.getByRole('button', { name: '风险管理' }).click();
  });
});
