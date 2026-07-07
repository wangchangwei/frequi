/**
 * Audit Center Store
 * Phase 6: Trade auditing, P&L reporting, and bot log analysis
 */
import { defineStore } from 'pinia';
import { acceptHMRUpdate } from 'pinia';
import type {
  AuditEntry,
  DailyPnL,
  PnLSummary,
  TradeAuditRecord,
  TradeFilters,
} from '@/types/audit';
import { useBotStore } from '@/stores/ftbotwrapper';

function inferCategory(message: string): AuditEntry['category'] {
  const lower = message.toLowerCase();
  if (
    lower.includes('trade') ||
    lower.includes('order') ||
    lower.includes('entry') ||
    lower.includes('exit')
  ) {
    return 'trade';
  }
  if (lower.includes('config') || lower.includes('parameter') || lower.includes('strategy')) {
    return 'config';
  }
  if (lower.includes('risk') || lower.includes('drawdown') || lower.includes('exposure')) {
    return 'risk';
  }
  if (lower.includes('system') || lower.includes('startup') || lower.includes('shutdown')) {
    return 'system';
  }
  return 'bot';
}

function mapLevel(level: string): AuditEntry['level'] {
  if (level === 'debug' || level === 'info') return 'info';
  if (level === 'warning') return 'warning';
  if (level === 'error') return 'error';
  return 'info';
}

export const useAuditStore = defineStore(
  'audit',
  () => {
    // State
    const auditLogs = ref<AuditEntry[]>([]);
    const trades = ref<TradeAuditRecord[]>([]);
    const dailyPnL = ref<DailyPnL[]>([]);
    const pnlSummary = ref<PnLSummary | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const tradeFilters = ref<TradeFilters>({});

    // Computed
    const filteredTrades = computed(() => {
      let result = [...trades.value];
      const f = tradeFilters.value;

      if (f.dateFrom) {
        const from = new Date(f.dateFrom).getTime();
        result = result.filter((t) => t.entryDate >= from);
      }
      if (f.dateTo) {
        const to = new Date(f.dateTo).getTime() + 86400000; // end of day
        result = result.filter((t) => t.entryDate <= to);
      }
      if (f.pair) {
        result = result.filter((t) => t.pair.toLowerCase().includes(f.pair!.toLowerCase()));
      }
      if (f.status && f.status !== 'all') {
        result = result.filter((t) => t.status === f.status);
      }
      if (f.profitMin !== undefined) {
        result = result.filter((t) => t.profitPct >= (f.profitMin ?? -Infinity));
      }
      if (f.profitMax !== undefined) {
        result = result.filter((t) => t.profitPct <= (f.profitMax ?? Infinity));
      }
      if (f.strategy) {
        result = result.filter((t) => t.strategy.toLowerCase().includes(f.strategy!.toLowerCase()));
      }
      return result;
    });

    // Actions
    async function fetchLogs(): Promise<void> {
      const botStore = useBotStore();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (botStore as any).activeBot?.value?.api;
      if (!api) {
        error.value = 'No active bot';
        return;
      }
      isLoading.value = true;
      error.value = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await (api as any).get('/logs');
        const data = res.data;
        auditLogs.value = ((data?.logs || []) as [number, string, string][]).map(
          ([ts, level, msg]) => ({
            id: crypto.randomUUID(),
            timestamp: ts * 1000,
            level: mapLevel(level),
            category: inferCategory(msg),
            message: msg,
          }),
        );
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to fetch logs';
        console.error(err);
      } finally {
        isLoading.value = false;
      }
    }

    async function fetchTrades(filters?: TradeFilters): Promise<void> {
      const botStore = useBotStore();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (botStore as any).activeBot?.value?.api;
      if (!api) {
        error.value = 'No active bot';
        return;
      }
      isLoading.value = true;
      error.value = null;
      try {
        if (filters) {
          tradeFilters.value = { ...filters };
        }
        const params: Record<string, unknown> = { limit: 500 };
        if (tradeFilters.value.dateFrom) params['start_date'] = tradeFilters.value.dateFrom;
        if (tradeFilters.value.dateTo) params['end_date'] = tradeFilters.value.dateTo;
        if (tradeFilters.value.pair) params['pair'] = tradeFilters.value.pair;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await (api as any).get('/trades', { params });
        const data = res.data;
        trades.value = ((data || []) as TradeAuditRecord[]).map((t) => ({
          ...t,
          side: t.side || ('long' as const),
          status: t.status || 'closed',
          orders: t.orders || [],
        }));
        computeDailyPnL();
        computePnLSummary();
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to fetch trades';
        console.error(err);
      } finally {
        isLoading.value = false;
      }
    }

    async function fetchPnL(): Promise<void> {
      const botStore = useBotStore();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (botStore as any).activeBot?.value?.api;
      if (!api) {
        error.value = 'No active bot';
        return;
      }
      isLoading.value = true;
      error.value = null;
      try {
        const { data } = await api.get('/profit');
        // Transform to PnLSummary
        pnlSummary.value = {
          totalProfit: data.profit_abs || 0,
          totalProfitPct: data.profit_all_ratio ? data.profit_all_ratio * 100 : 0,
          totalTrades: data.trades_count || 0,
          winningTrades: data.winning_trades || 0,
          losingTrades: data.losing_trades || 0,
          winRate: data.win_rate || 0,
          avgWin: data.avg_win || 0,
          avgLoss: data.avg_loss || 0,
          profitFactor: data.profit_factor || 0,
          maxDrawdown: data.max_drawdown_abs || 0,
          maxDrawdownPct: data.max_drawdown || 0,
          sharpeRatio: data.sharpe_ratio,
          startDate: data.closed_trade_end_timestamp
            ? new Date(data.closed_trade_end_timestamp).getTime()
            : undefined,
          endDate: data.closed_trade_start_timestamp
            ? new Date(data.closed_trade_start_timestamp).getTime()
            : undefined,
        };
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to fetch P&L';
        console.error(err);
      } finally {
        isLoading.value = false;
      }
    }

    function computeDailyPnL(): void {
      const byDate = new Map<string, DailyPnL>();
      trades.value.forEach((trade) => {
        const date = new Date(trade.entryDate).toISOString().split('T')[0];
        if (!byDate.has(date)) {
          byDate.set(date, {
            date,
            profitAbs: 0,
            profitPct: 0,
            tradeCount: 0,
            winCount: 0,
            lossCount: 0,
            volume: 0,
          });
        }
        const day = byDate.get(date)!;
        day.profitAbs += trade.profitAbs;
        day.tradeCount++;
        if (trade.profitAbs > 0) {
          day.winCount++;
        } else if (trade.profitAbs < 0) {
          day.lossCount++;
        }
        day.volume += trade.stakeAmount;
      });
      // Average P&L %
      byDate.forEach((day) => {
        day.profitPct = day.tradeCount > 0 ? (day.profitAbs / day.volume) * 100 : 0;
      });
      dailyPnL.value = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    function computePnLSummary(): void {
      const totalProfit = trades.value.reduce((sum, t) => sum + t.profitAbs, 0);
      const winningTrades = trades.value.filter((t) => t.profitAbs > 0);
      const losingTrades = trades.value.filter((t) => t.profitAbs < 0);
      const totalTrades = trades.value.length;
      const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
      const avgWin =
        winningTrades.length > 0
          ? winningTrades.reduce((sum, t) => sum + t.profitAbs, 0) / winningTrades.length
          : 0;
      const avgLoss =
        losingTrades.length > 0
          ? losingTrades.reduce((sum, t) => sum + t.profitAbs, 0) / losingTrades.length
          : 0;
      const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : avgWin > 0 ? Infinity : 0;

      // Max drawdown
      let maxDrawdown = 0;
      let runningMax = 0;
      trades.value
        .slice()
        .sort((a, b) => a.entryDate - b.entryDate)
        .forEach((t) => {
          runningMax += t.profitAbs;
          if (runningMax > 0) {
            // ignore for simplicity
          }
          maxDrawdown = Math.min(maxDrawdown, runningMax);
        });

      pnlSummary.value = {
        totalProfit,
        totalProfitPct:
          trades.value.length > 0
            ? (totalProfit / trades.value.reduce((sum, t) => sum + t.stakeAmount, 0)) * 100
            : 0,
        totalTrades,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate,
        avgWin,
        avgLoss,
        profitFactor,
        maxDrawdown: Math.abs(maxDrawdown),
        maxDrawdownPct: 0,
      };
    }

    function exportTradesCSV(): void {
      if (trades.value.length === 0) return;
      const headers = [
        'ID',
        'Date',
        'Pair',
        'Side',
        'Entry Price',
        'Exit Price',
        'Stake',
        'Profit%',
        'Status',
        'Exit Reason',
        'Strategy',
      ];
      const rows = filteredTrades.value.map((t) => [
        t.id,
        new Date(t.entryDate).toLocaleString(),
        t.pair,
        t.side,
        t.entryPrice,
        t.exitPrice ?? '',
        t.stakeAmount,
        t.profitPct.toFixed(2),
        t.status,
        t.exitReason ?? '',
        t.strategy,
      ]);
      downloadCSV('trades_audit.csv', headers, rows);
    }

    function exportAuditLogCSV(): void {
      if (auditLogs.value.length === 0) return;
      const headers = ['Timestamp', 'Level', 'Category', 'Message'];
      const rows = auditLogs.value.map((e) => [
        new Date(e.timestamp).toLocaleString(),
        e.level,
        e.category,
        e.message,
      ]);
      downloadCSV('audit_log.csv', headers, rows);
    }

    function downloadCSV(
      filename: string,
      headers: string[],
      rows: (string | number | undefined)[][],
    ): void {
      const csv = [
        headers.join(','),
        ...rows.map((r) => r.map((c) => JSON.stringify(c ?? '')).join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    function addAuditEntry(entry: Omit<AuditEntry, 'id'>): void {
      auditLogs.value.unshift({
        ...entry,
        id: crypto.randomUUID(),
      });
    }

    function clearLogs(): void {
      auditLogs.value = [];
    }

    function clearTrades(): void {
      trades.value = [];
      dailyPnL.value = [];
      pnlSummary.value = null;
    }

    return {
      // State
      auditLogs,
      trades,
      dailyPnL,
      pnlSummary,
      isLoading,
      error,
      tradeFilters,
      // Computed
      filteredTrades,
      // Actions
      fetchLogs,
      fetchTrades,
      fetchPnL,
      exportTradesCSV,
      exportAuditLogCSV,
      addAuditEntry,
      clearLogs,
      clearTrades,
    };
  },
  {
    persist: false,
  },
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuditStore, import.meta.hot));
}
