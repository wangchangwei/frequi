import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('AiAnalysis', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });

  test('AiAnalysis page loads with header', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByRole('heading', { name: 'AI 分析中心' })).toBeVisible();
  });

  test('AiAnalysis shows API key required banner when not configured', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByText('API Key Required')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Configure Key' })).toBeVisible();
  });

  test('AiAnalysis shows API key settings section when opened', async ({ page }) => {
    await page.goto('/ai-analysis');
    // Click configure key button
    await page.getByRole('button', { name: 'Configure Key' }).click();
    await expect(page.getByText('API Key Configuration')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Key' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Key' })).toBeVisible();
  });

  test('AiAnalysis shows analysis type selector', async ({ page }) => {
    await page.goto('/ai-analysis');
    // Analysis types are shown as buttons
    await expect(page.getByRole('button', { name: '策略' })).toBeVisible();
    await expect(page.getByRole('button', { name: '交易' })).toBeVisible();
    await expect(page.getByRole('button', { name: '性能' })).toBeVisible();
    await expect(page.getByRole('button', { name: '风险' })).toBeVisible();
  });

  test('AiAnalysis shows model selector', async ({ page }) => {
    await page.goto('/ai-analysis');
    // Model selector shows with label "Model:"
    await expect(page.getByText('Model:')).toBeVisible();
    await expect(page.getByText('gpt-4o-mini')).toBeVisible();
  });

  test('AiAnalysis shows analysis launcher panel', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByText('Start New Analysis')).toBeVisible();
  });

  test('AiAnalysis shows advanced options toggle', async ({ page }) => {
    await page.goto('/ai-analysis');
    await expect(page.getByRole('button', { name: 'Advanced Options' })).toBeVisible();
  });

  test('AiAnalysis API key dialog opens and saves', async ({ page }) => {
    await page.goto('/ai-analysis');
    await page.getByRole('button', { name: 'Configure Key' }).click();
    await expect(page.getByText('API Key Configuration')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Key' })).toBeVisible();
  });
});
