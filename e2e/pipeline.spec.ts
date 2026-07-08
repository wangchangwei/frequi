import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

// Pipeline test requires REAL Freqtrade at :8080
// Marked as skipped — real integration test, not e2e mock test
test.describe.skip('FreqUI pipeline against real :8080', () => {
  test('login → pairlist → download → backtest → recursive → lookahead → settings', async ({ page }) => {
    // This test requires actual Freqtrade running on port 8080
    // Skipped in CI/local dev — run manually against real bot
  });
});
