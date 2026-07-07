/**
 * Platform Store
 * Phase 1 MVP: Multi-bot data aggregation for dashboard
 */
import type { BalanceInterface } from '@/types';
import { useBotRegistryStore } from './botRegistry';
import { useBotStore } from './ftbotwrapper';

export interface PlatformStats {
  totalEquity: number;
  todayProfit: number;
  cumulativeProfit: number;
  totalOpenPositions: number;
  runningBots: number;
  stoppedBots: number;
  errorBots: number;
  todayTradeCount: number;
  topWinnerBotId?: string;
  topWinnerProfit: number;
  topLoserBotId?: string;
  topLoserProfit: number;
  lastUpdated: number;
}

export interface PerBotProfit {
  botId: string;
  botName: string;
  todayProfit: number;
  cumulativeProfit: number;
  openTrades: number;
}

export const usePlatformStore = defineStore('platform', () => {
  const botRegistryStore = useBotRegistryStore();
  const botStore = useBotStore();

  // Computed: aggregate profit across all registered bots
  const perBotProfits = computed<PerBotProfit[]>(() => {
    return botRegistryStore.bots.map((bot) => {
      const subStore = botStore.botStores[bot.botId];
      const profit = subStore?.profitAll;
      const todayData = subStore?.dailyStats?.data;

      // Calculate today's profit
      const todayProfit = todayData?.reduce((sum, d) => sum + (d.abs_profit || 0), 0) ?? 0;

      // Cumulative profit from profitAll
      const cumulativeProfit = profit?.all?.profit_closed_fiat ?? 0;

      return {
        botId: bot.botId,
        botName: bot.name,
        todayProfit,
        cumulativeProfit,
        openTrades: subStore?.openTrades?.length ?? 0,
      };
    });
  });

  // Computed: total equity across all bots
  const totalEquity = computed<number>(() => {
    if (!botStore.allBalance) return 0;
    let sum = 0;
    Object.values(botStore.allBalance).forEach((bal) => {
      sum += (bal as BalanceInterface).total ?? 0;
    });
    return sum;
  });

  // Computed: today's P&L aggregate
  const todayProfit = computed<number>(() => {
    return perBotProfits.value.reduce((sum, p) => sum + p.todayProfit, 0);
  });

  // Computed: cumulative P&L aggregate
  const cumulativeProfit = computed<number>(() => {
    return perBotProfits.value.reduce((sum, p) => sum + p.cumulativeProfit, 0);
  });

  // Computed: total open positions
  const totalOpenPositions = computed<number>(() => {
    return Object.values(botStore.allOpenTradeCount).reduce((sum, count) => sum + count, 0);
  });

  // Computed: running / stopped / error counts
  const runningBots = computed<number>(() => {
    return botRegistryStore.bots.filter((b) => {
      const sub = botStore.botStores[b.botId];
      return sub?.botState?.state === 'running';
    }).length;
  });

  const stoppedBots = computed<number>(() => {
    return botRegistryStore.bots.filter((b) => {
      const sub = botStore.botStores[b.botId];
      return sub?.botState?.state === 'stopped';
    }).length;
  });

  const errorBots = computed<number>(() => {
    return botRegistryStore.bots.filter((b) => b.status === 'error').length;
  });

  // Computed: today's trade count aggregate
  const todayTradeCount = computed<number>(() => {
    return botRegistryStore.bots.reduce((sum, bot) => {
      const sub = botStore.botStores[bot.botId];
      if (sub?.dailyStats?.data) {
        return sum + sub.dailyStats.data.reduce((s, d) => s + (d.trade_count || 0), 0);
      }
      return sum;
    }, 0);
  });

  // Computed: top winner and loser bots today
  const topWinner = computed<{ botId: string; profit: number } | undefined>(() => {
    if (perBotProfits.value.length === 0) return undefined;
    const sorted = [...perBotProfits.value].sort((a, b) => b.todayProfit - a.todayProfit);
    const best = sorted[0];
    return best ? { botId: best.botId, profit: best.todayProfit } : undefined;
  });

  const topLoser = computed<{ botId: string; profit: number } | undefined>(() => {
    if (perBotProfits.value.length === 0) return undefined;
    const sorted = [...perBotProfits.value].sort((a, b) => a.todayProfit - b.todayProfit);
    const worst = sorted[0];
    return worst ? { botId: worst.botId, profit: worst.todayProfit } : undefined;
  });

  // Full stats object
  const platformStats = computed<PlatformStats>(() => ({
    totalEquity: totalEquity.value,
    todayProfit: todayProfit.value,
    cumulativeProfit: cumulativeProfit.value,
    totalOpenPositions: totalOpenPositions.value,
    runningBots: runningBots.value,
    stoppedBots: stoppedBots.value,
    errorBots: errorBots.value,
    todayTradeCount: todayTradeCount.value,
    topWinnerBotId: topWinner.value?.botId,
    topWinnerProfit: topWinner.value?.profit ?? 0,
    topLoserBotId: topLoser.value?.botId,
    topLoserProfit: topLoser.value?.profit ?? 0,
    lastUpdated: Date.now(),
  }));

  return {
    perBotProfits,
    totalEquity,
    todayProfit,
    cumulativeProfit,
    totalOpenPositions,
    runningBots,
    stoppedBots,
    errorBots,
    todayTradeCount,
    topWinner,
    topLoser,
    platformStats,
  };
});
