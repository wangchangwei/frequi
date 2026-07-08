import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    page.route('**/api/v1/show_config', (route) => {
      return route.fulfill({ path: `./e2e/testData/backtest/show_config_webserver.json` });
    });
    page.route('**/api/v1/strategies', (route) => {
      return route.fulfill({ path: `./e2e/testData/backtest/strategies.json` });
    });

    await setLoginInfo(page);
  });
  test('Analysis navigation', async ({ page }) => {
    await page.goto('/');
    // The Analysis dropdown button in NavBar has label '分析'
    const analysisButton = page.getByRole('button', { name: '分析' });
    await expect(analysisButton).toBeInViewport();
    // The dropdown shows sub-items in Chinese
    await expect(page.getByText('递归分析')).not.toBeInViewport();
    await expect(page.getByText('前瞻分析')).not.toBeInViewport();
    analysisButton.click();
    await expect(page.getByText('递归分析')).toBeInViewport();
    await expect(page.getByText('前瞻分析')).toBeInViewport();
    // Click recursive analysis
    await page.getByText('递归分析').click();
    await expect(page).toHaveURL(/recursive_analysis/);
    await expect(page.getByTestId('recursive-analysis-header')).toBeInViewport();
    // Click lookahead analysis
    await page.getByRole('button', { name: '分析' }).click();
    await page.getByText('前瞻分析').click();
    await expect(page).toHaveURL(/lookahead_analysis/);
    await expect(page.getByTestId('lookahead-analysis-header')).toBeInViewport();
  });

  test('Lookahead analysis test', async ({ page }) => {
    await page.route('**/api/v1/lookahead_analysis**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          path: './e2e/testData/analysis/lookahead_post_start.json',
        });
      } else if (route.request().method() === 'GET') {
        await route.fulfill({
          path: './e2e/testData/analysis/lookahead_get_end.json',
        });
      }
    });

    let lookaheadStatusCounter = 0;
    await page.route('**/api/v1/background/*', async (route) => {
      lookaheadStatusCounter++;
      if (lookaheadStatusCounter > 1) {
        await route.fulfill({
          path: './e2e/testData/analysis/lookahead_status_2.json',
        });
      } else {
        await route.fulfill({
          path: './e2e/testData/analysis/lookahead_status_1.json',
        });
      }
    });

    await page.goto('/lookahead_analysis');
    await expect(page.getByTestId('lookahead-analysis-header')).toBeInViewport();

    await expect(page.getByRole('button', { name: '开始前瞻偏差分析' })).not.toBeEnabled();
    await page.getByRole('button', { name: 'Show popup' }).click();
    await page.getByText('AverageStrategy').click();
    await expect(page.getByRole('button', { name: '开始前瞻偏差分析' })).toBeEnabled();
    await page.getByRole('button', { name: '开始前瞻偏差分析' }).click();

    // Delays by a second due to background task timing
    await expect(page.getByTestId('analysis-result-header')).toBeInViewport();
    await expect(page.getByText('未检测到前瞻偏差')).toBeInViewport();
    await expect(page.getByRole('cell', { name: 'AverageStrategy' })).toBeInViewport();
    await expect(page.getByText('未检测到前瞻偏差')).toBeInViewport();
  });

  test('Recursive analysis test', async ({ page }) => {
    await page.route('**/api/v1/recursive_analysis**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          path: './e2e/testData/analysis/recursive_post_start.json',
        });
      } else if (route.request().method() === 'GET') {
        await route.fulfill({
          path: './e2e/testData/analysis/recursive_get_end.json',
        });
      }
    });

    let recursiveStatusCounter = 0;
    await page.route('**/api/v1/background/*', async (route) => {
      recursiveStatusCounter++;
      if (recursiveStatusCounter > 1) {
        await route.fulfill({
          path: './e2e/testData/analysis/recursive_status_2.json',
        });
      } else {
        await route.fulfill({
          path: './e2e/testData/analysis/recursive_status_1.json',
        });
      }
    });

    await page.goto('/recursive_analysis');
    await expect(page.getByTestId('recursive-analysis-header')).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Start recursive analysis' })).not.toBeEnabled();
    await page.getByRole('button', { name: 'Show popup' }).click();
    await page.getByText('AverageStrategy').click();
    await expect(page.getByRole('button', { name: 'Start recursive analysis' })).toBeEnabled();
    await page.getByRole('button', { name: 'Start recursive analysis' }).click();

    // Delays by a second due to background task timing
    await expect(page.getByTestId('analysis-result-header')).toBeInViewport();
    await expect(
      page.getByText('4 indicator(s) affected by startup candle count'),
    ).toBeInViewport();
    await expect(page.getByRole('cell', { name: 'rsi' })).toBeVisible();
    await expect(page.getByText('4 indicator(s) affected by')).toBeInViewport();
    await expect(page.getByRole('cell', { name: 'rsi' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '0.167%' })).toBeVisible();
  });
});
