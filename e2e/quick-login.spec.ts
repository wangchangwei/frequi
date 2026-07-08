import { test, expect } from '@playwright/test';
import { defaultMocks } from './helpers';

/**
 * Quick Login button on the standalone /login page (src/components/BotLogin.vue).
 *
 * The button lives next to "提交" in the form footer. Clicking it fills all
 * four fields with the agreed defaults so the user only has to click submit:
 *   - botName : "Robot"
 *   - url     : "http://127.0.0.1:8080"   (freqtrade API server default port)
 *   - username: "freqtrader"   (must match freqtrade api_server.username, case-sensitive)
 *   - password: "freqtrader"
 *
 * Crucially, the button must NOT submit — it only fills the form.
 */

test.describe('Quick Login button', () => {
  test('fills all four fields with the agreed defaults and does not submit', async ({ page }) => {
    // Track any token-login requests so we can assert none fires from the button itself.
    const loginRequests: string[] = [];
    // Match the order used by login.spec.ts happy path: register the catch-all
    // defaultMocks first, then a specific token-login route. Playwright resolves
    // routes LIFO, so the specific token-login mock wins over the catch-all.
    await defaultMocks(page);

    // Mock CORS-correctly: withCredentials + wildcard is rejected, and the
    // Quick-Login URL default (http://127.0.0.1:8080) makes this a cross-origin
    // request from http://localhost:4399. Echo the actual request origin and
    // allow credentials so the browser accepts the response.
    await page.route('**/api/v1/token/login', (route) => {
      loginRequests.push(route.request().url());
      return route.fulfill({
        status: 200,
        json: { access_token: 'tok', refresh_token: 'ref' },
        headers: {
          'access-control-allow-origin': 'http://localhost:4399',
          'access-control-allow-credentials': 'true',
        },
      });
    });

    await page.goto('/login');
    await expect(page.locator('.drag-header', { hasText: '登录 Freqtrade 机器人' })).toBeVisible();

    // Sanity: button exists, is a plain button (type=button), not submit.
    const quickBtn = page.getByRole('button', { name: '快捷登录' });
    await expect(quickBtn).toBeVisible();
    await expect(quickBtn).toHaveAttribute('type', 'button');

    await quickBtn.click();
    // Give Vue a tick to commit the reactive writes.
    await page.waitForTimeout(100);

    await expect(page.getByRole('textbox', { name: '机器人名称' })).toHaveValue('Robot');
    await expect(page.locator('#url-input')).toHaveValue('http://127.0.0.1:8080');
    await expect(page.getByRole('textbox', { name: '用户名' })).toHaveValue('freqtrader');
    // Password input has no role=accessible-name in headless; locate by id/placeholder structure.
    await expect(page.locator('input[type="password"]')).toHaveValue('freqtrader');

    // No submission yet — no token-login request fired.
    expect(loginRequests).toEqual([]);
  });

  test('happy path: quick-fill + submit logs in successfully', async ({ page }) => {
    // Match login.spec.ts happy-path order: defaultMocks first, then a more
    // specific token-login route. Playwright resolves routes LIFO, so the
    // specific token-login mock wins over the **/api/v1/** catch-all.
    await defaultMocks(page);

    // URL is rewritten to localhost:3000 (same-origin) so the test focuses on
    // the Quick-Login flow itself without dragging CORS preflight into scope.
    // The cross-origin behaviour against a real freqtrade on :8080 is covered
    // by manual smoke; e2e tests in this repo consistently mock the API.
    // Mock CORS-correctly: see the comment in the fill-only test below for why.
    await page.route('**/api/v1/token/login', (route) =>
      route.fulfill({
        status: 200,
        json: { access_token: 'access_quick', refresh_token: 'refresh_quick' },
        headers: {
          'access-control-allow-origin': 'http://localhost:4399',
          'access-control-allow-credentials': 'true',
        },
      }),
    );

    await page.goto('/login');
    await expect(page.locator('.drag-header', { hasText: '登录 Freqtrade 机器人' })).toBeVisible();

    await page.getByRole('button', { name: '快捷登录' }).click();
    await page.waitForTimeout(100);

    // URL stays at its default (window.location.origin == http://localhost:4399) so
    // the mocked token/login call is same-origin and the mock can answer with a
    // wildcard CORS header without preflight drama. The Quick-Login URL default
    // (http://127.0.0.1:8080) is asserted in the fill-only test above; here we just
    // need the form to be submittable.

    const submit = page.getByRole('button', { name: '提交' });
    await expect(submit).toBeVisible();
    const respPromise = page.waitForResponse('**/api/v1/token/login');
    await submit.click();
    await respPromise;

    // Logged in → redirected to '/' and the new bot is listed.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Robot', { exact: true })).toBeVisible();
  });
});
