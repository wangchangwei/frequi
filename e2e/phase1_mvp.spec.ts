import { test, expect } from '@playwright/test';
import { defaultMocks, setLoginInfo } from './helpers';

/**
 * Phase 1 MVP E2E Tests for FreqUI
 *
 * Scope:
 * - Anonymous routes: Home, Login page, Pairlist Config, 404
 * - Authenticated routes (via setLoginInfo): Dashboard, Bots, Settings, Nav
 * - Smoke: no console errors, night mode toggle
 */

const BASE = 'http://127.0.0.1:5173';

// ---------------------------------------------------------------------------
// Anonymous routes (no bot required)
// ---------------------------------------------------------------------------

test('Home: renders welcome page with nav and login button', async ({ page }) => {
  await page.goto(BASE);

  await expect(page).toHaveTitle(/FreqUI/i);

  await expect(page.getByRole('link', { name: '仪表盘' })).toBeVisible();
  await expect(page.getByRole('link', { name: '机器人' })).toBeVisible();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('欢迎使用');
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Freqtrade 官方文档/i })).toBeVisible();
});

test('Home: Night Mode toggle changes body class', async ({ page }) => {
  await page.goto(BASE);

  const toggle = page.getByRole('button', { name: 'Toggle Night Mode' });
  await expect(toggle).toBeVisible();

  const body = page.locator('body');
  const initial = (await body.getAttribute('class')) ?? '';

  await toggle.click();
  const after = (await body.getAttribute('class')) ?? '';
  expect(after).not.toBe(initial);
});

test('Login page: all required fields are present', async ({ page }) => {
  await page.goto(`${BASE}/login`);

  await expect(page.locator('.drag-header', { hasText: '登录 Freqtrade 机器人' })).toBeVisible();

  await expect(page.getByRole('textbox', { name: '机器人名称' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'API 地址' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '用户名' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '密码' })).toBeVisible();

  await expect(page.getByRole('button', { name: '重置' })).toBeVisible();
  await expect(page.getByRole('button', { name: '快捷登录' })).toBeVisible();
  await expect(page.getByRole('button', { name: '提交' })).toBeVisible();
});

test('Login page: API 地址 field is marked required', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  const apiField = page.getByRole('textbox', { name: 'API 地址' });
  await expect(apiField).toHaveAttribute('required');
});

test('Login page: submitting without credentials shows field-level errors', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByRole('button', { name: '提交' }).click();
  // App shows "用户名和密码是必填项。" on failed validation
  await expect(page.getByText('用户名和密码是必填项。')).toBeVisible();
});

test('Pairlist Config: renders without redirect', async ({ page }) => {
  await page.goto(`${BASE}/pairlist_config`);
  await expect(page).toHaveURL(/pairlist_config/);
  await expect(page.locator('body')).not.toBeEmpty();
});

test('Unknown route: renders 404 page without crash', async ({ page }) => {
  await page.goto(`${BASE}/this-route-does-not-exist`);
  await expect(page).toHaveURL(/this-route-does-not-exist/);
  await expect(page.locator('body')).not.toBeEmpty();
});

test('Unauthenticated trade route: redirects to /login?redirect=/trade', async ({ page }) => {
  await page.goto(`${BASE}/trade`);
  await expect(page).toHaveURL(/\/login\?redirect=\/trade/);
});

// ---------------------------------------------------------------------------
// Authenticated routes (via setLoginInfo helper)
// ---------------------------------------------------------------------------

test('Dashboard: renders bot list when logged in', async ({ page }) => {
  await setLoginInfo(page);
  await page.goto(`${BASE}/dashboard`);
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator('body')).not.toBeEmpty();
});

test('Bots: renders bot registry page', async ({ page }) => {
  await setLoginInfo(page);
  await page.goto(`${BASE}/bots`);
  await expect(page).toHaveURL(/bots/);
  await expect(page.locator('body')).not.toBeEmpty();
});

test('Settings: renders settings page', async ({ page }) => {
  await setLoginInfo(page);
  await page.goto(`${BASE}/settings`);
  await expect(page).toHaveURL(/settings/);
  await expect(page.locator('body')).not.toBeEmpty();
});

test('Auto Refresh checkbox: toggles without error', async ({ page }) => {
  await page.goto(BASE);
  const checkbox = page.getByRole('checkbox');
  await expect(checkbox).toBeVisible();

  await checkbox.click();
  await expect(checkbox).not.toBeChecked();

  await checkbox.click();
  await expect(checkbox).toBeChecked();
});

test('Nav sidebar: clicking each link updates URL (authenticated)', async ({ page }) => {
  await setLoginInfo(page);
  await page.goto(BASE);

  const navLinks = [
    { name: '仪表盘', path: '/dashboard' },
    { name: '机器人', path: '/bots' },
    { name: '账户', path: '/accounts' },
    { name: '策略', path: '/strategies' },
    { name: '配置中心', path: '/configs' },
    { name: '交易', path: '/trade' },
    { name: '图表', path: '/graph' },
    { name: '日志', path: '/logs' },
    { name: '回测中心', path: '/backtest' },
    { name: '风险管理', path: '/risk' },
    { name: '告警中心', path: '/alerts' },
    { name: '审计中心', path: '/audit' },
    { name: 'Hyperopt', path: '/hyperopt' },
  ];

  for (const link of navLinks) {
    const el = page.getByRole('link', { name: link.name });
    await el.click();
    await expect(page).toHaveURL(new RegExp(link.path), { timeout: 3000 });
  }
});

// ---------------------------------------------------------------------------
// Smoke
// ---------------------------------------------------------------------------

test('No console errors on home page load', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto(BASE);
  await page.waitForLoadState('networkidle');

  const realErrors = errors.filter(
    (e) => !e.includes('favicon') && !e.includes('404'),
  );
  expect(realErrors).toHaveLength(0);
});
