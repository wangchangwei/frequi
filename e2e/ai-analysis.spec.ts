import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('AiAnalysis', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('AiAnalysis page loads with header', async ({ page }) => {
    await page.goto('/ai-analysis');
    // The header is inside DraggableContainer
    await expect(page.getByText('AI 分析中心').first()).toBeVisible();
  });

  test('AiAnalysis shows API key required banner when not configured', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByText('API Key Required').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Configure Key' })).toBeVisible();
  });

  test('AiAnalysis shows analysis type selector buttons', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByRole('button', { name: '策略' })).toBeVisible();
    await expect(page.getByRole('button', { name: '交易' })).toBeVisible();
    await expect(page.getByRole('button', { name: '性能' })).toBeVisible();
    await expect(page.getByRole('button', { name: '风险' })).toBeVisible();
  });

  test('AiAnalysis shows analysis launcher panel', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByText('Start New Analysis').first()).toBeVisible();
  });

  test('AiAnalysis shows advanced options toggle', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByRole('button', { name: 'Advanced Options' })).toBeVisible();
  });

  test('Configure Key button is visible', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByRole('button', { name: 'Configure Key' })).toBeVisible();
  });
});
