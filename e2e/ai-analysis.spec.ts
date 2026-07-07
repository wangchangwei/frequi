import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('AiAnalysis', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('AiAnalysis page loads with header', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByRole('heading', { name: 'AI 分析' })).toBeVisible();
  });

  test('AiAnalysis shows API key settings section', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByText('API Key 设置')).toBeVisible();
    await expect(page.getByRole('button', { name: '设置 API Key' })).toBeVisible();
  });

  test('AiAnalysis shows analysis type selector', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByText('分析类型')).toBeVisible();
    await expect(page.getByText('策略')).toBeVisible();
    await expect(page.getByText('交易')).toBeVisible();
    await expect(page.getByText('性能')).toBeVisible();
    await expect(page.getByText('风险')).toBeVisible();
  });

  test('AiAnalysis shows model selector', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByText('选择模型')).toBeVisible();
    await expect(page.getByText('gpt-4o-mini')).toBeVisible();
  });

  test('AiAnalysis shows run analysis button', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByRole('button', { name: '开始分析' })).toBeVisible();
  });

  test('AiAnalysis shows analysis history section', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByText('分析历史')).toBeVisible();
  });

  test('AiAnalysis shows advanced options toggle', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByText('高级选项')).toBeVisible();
    await expect(page.getByRole('switch', { name: '显示高级选项' })).toBeVisible();
  });

  test('AiAnalysis API key dialog opens', async ({ page }) => {
    await page.goto('/ai-analysis');
    await page.getByRole('button', { name: '设置 API Key' }).click();
    await expect(page.getByText('设置 API Key')).toBeVisible();
    await expect(page.getByText('保存')).toBeVisible();
    await expect(page.getByText('清除')).toBeVisible();
  });
});
