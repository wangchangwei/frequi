import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: {
      allowAnonymous: true,
    },
  },
  {
    path: '/trade',
    name: 'Trading',
    component: () => import('@/views/TradingView.vue'),
  },
  {
    path: '/graph',
    name: 'Graph',
    component: () => import('@/views/ChartsView.vue'),
  },
  {
    path: '/logs',
    name: 'Logs',
    component: () => import('@/views/LogView.vue'),
  },
  {
    path: '/backtest',
    name: 'Backtest',
    component: () => import('@/views/BacktestingView.vue'),
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
  },
  {
    path: '/bots',
    name: 'BotRegistry',
    component: () => import('@/views/BotRegistryView.vue'),
  },
  {
    path: '/bots/:id',
    name: 'BotDetail',
    component: () => import('@/views/BotDetailView.vue'),
  },
  {
    path: '/accounts',
    name: 'AccountList',
    component: () => import('@/views/AccountListView.vue'),
  },
  {
    path: '/strategies',
    name: 'StrategyList',
    component: () => import('@/views/StrategyListView.vue'),
  },
  {
    path: '/strategies/:id',
    name: 'StrategyDetail',
    component: () => import('@/views/StrategyDetailView.vue'),
  },
  {
    path: '/configs',
    name: 'ConfigCenter',
    component: () => import('@/views/ConfigCenterView.vue'),
  },
  {
    path: '/configs/:id',
    name: 'ConfigDetail',
    component: () => import('@/views/ConfigDetailView.vue'),
  },
  {
    path: '/configs/:id/diff',
    name: 'ConfigDiff',
    component: () => import('@/views/ConfigDiffView.vue'),
  },
  {
    path: '/balance',
    name: 'Balance',
    component: () => import('@/components/ftbot/BotBalance.vue'),
  },
  {
    path: '/open_trades',
    component: () => import('@/views/MobileTradesListView.vue'),
  },

  {
    path: '/trade_history',
    component: () => import('@/views/MobileTradesListView.vue'),
    props: { history: true },
  },
  {
    path: '/pairlist',
    component: () => import('@/components/ftbot/PairListLive.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: {
      allowAnonymous: true,
    },
  },
  {
    path: '/pairlist_config',
    name: 'Pairlist Configuration',
    component: () => import('@/views/PairlistConfigView.vue'),
    meta: {
      allowAnonymous: true,
    },
  },
  {
    path: '/download_data',
    name: 'Download Data',
    component: () => import('@/views/DownloadDataView.vue'),
  },
  {
    path: '/recursive_analysis',
    name: 'Recursive Analysis',
    component: () => import('@/views/RecursiveAnalysisView.vue'),
  },
  {
    path: '/lookahead_analysis',
    name: 'Lookahead Analysis',
    component: () => import('@/views/LookaheadAnalysisView.vue'),
  },
  {
    path: '/backtest-jobs',
    name: 'BacktestJobQueue',
    component: () => import('@/views/BacktestJobQueueView.vue'),
  },
  {
    path: '/backtest-compare',
    name: 'BacktestComparison',
    component: () => import('@/views/BacktestComparisonView.vue'),
  },
  {
    path: '/risk',
    name: 'RiskDashboard',
    component: () => import('@/views/RiskDashboardView.vue'),
  },
  {
    path: '/alerts',
    name: 'AlertCenter',
    component: () => import('@/views/AlertCenterView.vue'),
  },
  {
    path: '/ai-analysis',
    name: 'AiAnalysis',
    component: () => import('@/views/AiAnalysisView.vue'),
  },
  {
    path: '/audit',
    name: 'AuditCenter',
    component: () => import('@/views/AuditCenterView.vue'),
  },
  {
    path: '/hyperopt',
    name: 'Hyperopt',
    component: () => import('@/views/HyperoptView.vue'),
  },
  {
    path: '/(.*)*',
    name: '404',
    component: () => import('@/views/Error404View.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to) => {
  // Init bots here...
  initBots();
  const botStore = useBotStore();
  if (!to.meta?.allowAnonymous && !botStore.hasBots) {
    // Forward to login if login is required
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    };
  } else {
    return true;
  }
});

export default router;
