import { test, expect } from '@playwright/test';
import { defaultMocks, setLoginInfo } from './helpers';

/**
 * Login flow tests.
 *
 * UI is built on Nuxt UI v4 (UFormField, UInput, UButton, UModal, UAlert) and the
 * chrome has been re-translated to 简体中文, so selectors match the current labels:
 *   - Bot Login (DraggableContainer header) – still English, kept as-is in source
 *   - Field labels: 机器人名称 / API 地址 / 用户名 / 密码
 *   - Submit button: 提交  (sidebar/nav login button: 登录)
 *   - Modal title:  "Login to your bot"
 *   - Logout menu item: 退出登录 (FT avatar dropdown)
 *   - "no bot" hint in sidebar: 未选择机器人
 *   - Failure title: 登录失败 / body: 已连接到机器人，但登录失败，用户名或密码错误。
 *   - Field errors: 用户名和密码为必填项。 / 密码无效
 */

test.describe('Login', () => {
  test('Is not logged in – home shows login button and sidebar hint', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
    // Sidebar shows 未选择机器人 when no bot is selected
    await expect(page.getByText('未选择机器人')).toBeVisible();
  });

  test('Sidebar 登录 button opens modal with form', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page.getByText('Login to your bot')).toBeVisible();
    await expect(page.locator('#url-input')).toHaveValue('http://localhost:3000');
    await expect(page.getByRole('textbox', { name: '机器人名称' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '用户名' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '密码' })).toBeVisible();
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible();
  });

  test('Explicit login page shows standalone Bot Login card', async ({ page }) => {
    await page.goto('/login');
    // Sidebar login button hidden on /login (NavBar swaps to avatar); the form is the page.
    await expect(page.locator('.drag-header', { hasText: 'Bot Login' })).toBeVisible();
    await expect(page.locator('#url-input')).toHaveValue('http://localhost:3000');
    await expect(page.getByRole('textbox', { name: '机器人名称' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '用户名' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '密码' })).toBeVisible();
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible();
  });

  test('Redirect when not logged in (no bots in storage)', async ({ page }) => {
    await page.goto('/trade');
    await expect(page).toHaveURL(/\/login\?redirect=\/trade/);
  });

  test('Test Login – happy path', async ({ page }) => {
    await defaultMocks(page);
    await page.goto('/login');
    await expect(page.locator('.drag-header', { hasText: 'Bot Login' })).toBeVisible();

    await page.getByRole('textbox', { name: '机器人名称' }).fill('TestBot');
    await page.getByRole('textbox', { name: '用户名' }).fill('user');
    await page.getByRole('textbox', { name: '密码' }).fill('SuperDuperBot');

    await page.route('**/api/v1/token/login', (route) => {
      return route.fulfill({
        status: 200,
        json: { access_token: 'access_token_tesst', refresh_token: 'refresh_test' },
        headers: { 'access-control-allow-origin': '*' },
      });
    });

    const submit = page.getByRole('button', { name: '提交' });
    await expect(submit).toBeVisible();
    await Promise.all([submit.click(), page.waitForResponse('**/api/v1/token/login')]);

    // Login success: redirected to '/' and bot added
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('TestBot', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '添加新机器人' })).toBeVisible();

    // Sidebar login button gone, FT avatar present instead
    await expect(page.getByRole('button', { name: '登录' })).not.toBeVisible();

    // Logout via FT menu
    await page.getByRole('button', { name: 'FT' }).click();
    await page.getByRole('menuitem', { name: '退出登录' }).click();
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
  });

  test('Test Login failed – API URL unreachable (404)', async ({ page }) => {
    await defaultMocks(page);
    await page.goto('/login');
    await expect(page.locator('.drag-header', { hasText: 'Bot Login' })).toBeVisible();

    await page.getByRole('textbox', { name: '机器人名称' }).fill('TestBot');
    await page.getByRole('textbox', { name: '用户名' }).fill('user');
    await page.getByRole('textbox', { name: '密码' }).fill('SuperDuperBot');

    await page.route('**/api/v1/token/login', (route) => {
      return route.fulfill({
        status: 404,
        json: { access_token: 'access_token_tesst', refresh_token: 'refresh_test' },
        headers: { 'access-control-allow-origin': '*' },
      });
    });

    const submit = page.getByRole('button', { name: '提交' });
    await expect(submit).toBeVisible();
    await Promise.all([submit.click(), page.waitForResponse('**/api/v1/token/login')]);

    // Failure: title shows 登录失败, body tells user to check the bot.
    await expect(page.getByText('登录失败').first()).toBeVisible();
    // The form should signal that the URL is required (urlState=false -> inline error).
    await expect(page.getByText('API 地址为必填项。')).toBeVisible();
  });

  test('Test Login failed – wrong password (401)', async ({ page }) => {
    await defaultMocks(page);
    await page.goto('/login');
    await expect(page.locator('.drag-header', { hasText: 'Bot Login' })).toBeVisible();

    await page.getByRole('textbox', { name: '机器人名称' }).fill('TestBot');
    await page.getByRole('textbox', { name: '用户名' }).fill('user');
    await page.getByRole('textbox', { name: '密码' }).fill('SuperDuperBot');

    await page.route('**/api/v1/token/login', (route) => {
      return route.fulfill({
        status: 401,
        json: { access_token: 'access_token_tesst', refresh_token: 'refresh_test' },
        headers: { 'access-control-allow-origin': '*' },
      });
    });

    const submit = page.getByRole('button', { name: '提交' });
    await expect(submit).toBeVisible();

    // Sanity: error messages not present before submit
    await expect(page.getByText('用户名和密码为必填项。')).not.toBeVisible();
    await expect(page.getByText('已连接到机器人，但登录失败')).not.toBeVisible();
    await expect(page.getByText('密码无效')).not.toBeVisible();

    await Promise.all([submit.click(), page.waitForResponse('**/api/v1/token/login')]);

    // After 401 the BotLogin handler sets nameState=false (username-required msg) and
    // pwdState=false (invalid-password msg) and the errorMessage alert is shown.
    await expect(page.getByText('登录失败').first()).toBeVisible();
    await expect(page.getByText('用户名和密码为必填项。')).toBeVisible();
    await expect(page.getByText('密码无效')).toBeVisible();
    await expect(page.getByText('已连接到机器人，但登录失败')).toBeVisible();
  });

  test('setLoginInfo helper skips the login redirect (smoke)', async ({ page }) => {
    await setLoginInfo(page);
    await page.goto('/trade');
    // has a stored token, so the router guard should NOT redirect.
    await expect(page).not.toHaveURL(/\/login/);
  });
});
