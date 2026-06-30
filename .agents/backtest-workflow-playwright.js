/**
 * Backtest Workflow Playwright Script
 *
 * DEPENDENCY: Playwright must be installed:
 *   pnpm add -D playwright
 *
 * This script is a reference implementation. The actual Playwright automation
 * is typically driven via the MCP server tools (mcp__plugin_playwright_*).
 *
 * For command-line execution, run with node + playwright:
 *   node backtest-workflow-playwright.js [--strategy=STRAT] [--timerange=RANGE]
 *
 * Defaults: strategy=SampleStrategy, timerange=20260101-20260630, pairs=top5-by-volume
 */

const API_BASE = 'http://127.0.0.1:8080';
const FREQUI_URL = 'http://localhost:4399';
const CREDENTIALS = { username: 'freqtrader', password: 'SuperSecurePassword' };

async function getAccessToken() {
  const creds = Buffer.from(`${CREDENTIALS.username}:${CREDENTIALS.password}`).toString('base64');
  const resp = await fetch(`${API_BASE}/api/v1/token/login`, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}` },
  });
  const data = await resp.json();
  return data.access_token;
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function clearAutoRefresh(page) {
  await page.evaluate(() => {
    const app = document.querySelector('#app')?.__vue_app__;
    const pinia = app?.config?.globalProperties?.$pinia;
    const stores = pinia?._s;
    const wrapper = stores?.get('ftbot-wrapper');
    if (wrapper?.refreshInterval) { clearInterval(wrapper.refreshInterval); wrapper.refreshInterval = null; }
    if (wrapper?.refreshIntervalSlow) { clearInterval(wrapper.refreshIntervalSlow); wrapper.refreshIntervalSlow = null; }
  });
}

async function injectAuth(page) {
  const token = await getAccessToken();
  const refreshResp = await fetch(`${API_BASE}/api/v1/token/login`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${CREDENTIALS.username}:${CREDENTIALS.password}`).toString('base64')}` },
  });
  const refreshData = await refreshResp.json();
  const authData = {
    freqtrade: {
      botName: 'freqtrade',
      apiUrl: API_BASE,
      username: CREDENTIALS.username,
      accessToken: token,
      refreshToken: refreshData.refresh_token,
      autoRefresh: true,
      sortId: 1,
    },
  };
  await page.evaluate((data) => {
    localStorage.setItem('ftAuthLoginInfo', JSON.stringify(data));
  }, authData);
}

async function getActiveBot(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app')?.__vue_app__;
    const pinia = app?.config?.globalProperties?.$pinia;
    const stores = pinia?._s;
    const wrapper = stores?.get('ftbot-wrapper');
    return wrapper?.activeBot || null;
  });
}

// ─── Step 1: Pairlist Evaluation ────────────────────────────────────────────────
async function step1_pairlistEvaluate(page) {
  console.log('\n=== Step 1: Pairlist Evaluation ===');

  // Get available generators from API
  const token = await getAccessToken();
  const availResp = await fetch(`${API_BASE}/api/v1/pairlists/available`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const availData = await availResp.json();
  const generators = availData.pairlists.filter(p => p.is_pairlist_generator);

  // Add VolumePairList (or StaticPairList as fallback)
  const pairlistName = 'VolumePairList';
  const pairlist = generators.find(p => p.name === pairlistName);
  if (!pairlist) throw new Error(`Pairlist ${pairlistName} not found`);

  const result = await page.evaluate((pl) => {
    const app = document.querySelector('#app')?.__vue_app__;
    const pinia = app?.config?.globalProperties?.$pinia;
    const stores = pinia?._s;
    const pcStore = stores?.get('pairlistConfig');
    if (!pcStore) return { success: false, error: 'no pairlistConfig store' };

    pcStore.addToConfig({ ...pl, id: `${pl.name.toLowerCase()}-1`, showParameters: false, params: {} }, 0);
    pcStore.startPairlistEvaluation();
    return { success: true, evaluating: pcStore.evaluating };
  }, pairlist);

  if (!result.success) throw new Error(result.error);

  // Poll for result
  for (let i = 0; i < 30; i++) {
    await wait(1000);
    const status = await page.evaluate(() => {
      const app = document.querySelector('#app')?.__vue_app__;
      const pinia = app?.config?.globalProperties?.$pinia;
      const pcStore = pinia?._s?.get('pairlistConfig');
      return { evaluating: pcStore?.evaluating, whitelist: pcStore?.whitelist };
    });
    if (!status.evaluating && status.whitelist?.length > 0) {
      console.log(`Whitelist: ${status.whitelist.length} pairs`);
      return status.whitelist;
    }
  }
  throw new Error('Pairlist evaluation timed out');
}

// ─── Step 2: Download Data ─────────────────────────────────────────────────
async function step2_downloadData(page, pairs, options = {}) {
  console.log('\n=== Step 2: Download Data ===');
  const { timeframes = ['5m', '4h', '1d'], timerange = '20260101-20260630', erase = true } = options;

  const activeBot = await getActiveBot(page);
  if (!activeBot) throw new Error('No activeBot');

  await activeBot.startDataDownload({
    pairs,
    timeframes,
    days: 0,
    timerange,
    erase,
  });

  // Poll via API
  const token = await getAccessToken();
  let jobId = null;

  // The download started, find the job id from background jobs
  for (let i = 0; i < 10; i++) {
    await wait(2000);
    const resp = await fetch(`${API_BASE}/api/v1/background`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const jobs = await resp.json();
    const downloadJob = Array.isArray(jobs) ? jobs.find(j => j.job_category === 'download_data' && j.running) : null;
    if (downloadJob) { jobId = downloadJob.job_id; break; }
  }

  if (jobId) {
    for (let i = 0; i < 60; i++) {
      await wait(5000);
      const resp = await fetch(`${API_BASE}/api/v1/background/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const status = await resp.json();
      if (!status.running) {
        console.log(`Download ${status.status}: ${status.error || 'completed'}`);
        return;
      }
    }
    throw new Error('Download timed out');
  } else {
    console.log('Download started (job id not tracked)');
  }
}

// ─── Step 3: Backtest ──────────────────────────────────────────────────────
async function step3_backtest(page, options = {}) {
  console.log('\n=== Step 3: Backtest ===');
  const { strategy = 'SampleStrategy', timerange = '20260101-20260630', timeframe = '5m', pairs } = options;

  const activeBot = await getActiveBot(page);
  if (!activeBot) throw new Error('No activeBot');

  await activeBot.startBacktest({
    strategy,
    timerange,
    timeframe,
    enable_protections: false,
    pairs,
  });

  const token = await getAccessToken();
  for (let i = 0; i < 60; i++) {
    await wait(5000);
    const resp = await fetch(`${API_BASE}/api/v1/backtest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    if (data.status === 'ended') {
      const sc = data.backtest_result?.strategy_comparison || [];
      for (const s of sc) {
        console.log(`${s.key}: ${s.trades} trades, profit: ${s.profit_total_pct}%, winrate: ${(s.winrate * 100).toFixed(1)}%`);
      }
      return data.backtest_result;
    }
    if (data.status === 'error') {
      throw new Error(`Backtest failed: ${data.status_msg}`);
    }
    console.log(`Running... ${data.status_msg || data.status}`);
  }
  throw new Error('Backtest timed out');
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map(a => { const [k, v] = a.split('='); return [k.replace('--', ''), v]; })
  );

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(FREQUI_URL);
    await wait(2000);

    // Inject auth
    await injectAuth(page);
    await page.goto(`${FREQUI_URL}/pairlist_config`);
    await wait(2000);
    await clearAutoRefresh(page);

    // Step 1: Evaluate pairlist
    const whitelist = await step1_pairlistEvaluate(page);

    // Use top 5 pairs for faster backtest
    const testPairs = whitelist.slice(0, 5);
    const pairsStr = testPairs.join(',');

    // Step 2: Download data
    await step2_downloadData(page, whitelist, {
      timeframes: ['5m', '4h', '1d'],
      timerange: args.timerange || '20260101-20260630',
      erase: true,
    });

    // Wait for download to finish
    await wait(30000);

    // Step 3: Backtest
    await step3_backtest(page, {
      strategy: args.strategy || 'SampleStrategy',
      timerange: args.timerange || '20260101-20260630',
      timeframe: '5m',
      pairs: pairsStr,
    });

  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
