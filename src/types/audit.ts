/**
 * Audit Center Types
 * Phase 6: Trade auditing, P&L reporting, and bot log analysis
 */

export interface AuditEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error';
  category: 'trade' | 'config' | 'system' | 'risk' | 'bot';
  message: string;
  details?: Record<string, unknown>;
  botId?: string;
}

export interface TradeAuditRecord {
  id: number;
  pair: string;
  entryDate: number;
  exitDate?: number;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  stakeAmount: number;
  profitAbs: number;
  profitPct: number;
  status: 'open' | 'closed' | 'cancelled';
  exitReason?: string;
  strategy: string;
  timeframe: string;
  tags?: string[];
  orders: TradeOrder[];
}

export interface TradeOrder {
  id: string;
  side: 'entry' | 'exit';
  type: 'market' | 'limit' | 'stop_loss' | 'take_profit';
  price: number;
  filledPrice?: number;
  amount: number;
  timestamp: number;
  status: 'pending' | 'filled' | 'cancelled';
}

export interface DailyPnL {
  date: string;
  profitAbs: number;
  profitPct: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  volume: number;
}

export interface PnLSummary {
  totalProfit: number;
  totalProfitPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  sharpeRatio?: number;
  startDate?: number;
  endDate?: number;
}

export interface TradeFilters {
  dateFrom?: string;
  dateTo?: string;
  pair?: string;
  status?: 'open' | 'closed' | 'all';
  profitMin?: number;
  profitMax?: number;
  strategy?: string;
}
