export type BacktestJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface BacktestJob {
  id: string; // UUID
  name: string; // Job display name
  strategyName: string;
  configId?: string; // Optional link to configTemplate
  accountId?: string; // Optional link to exchange account
  pairs: string[]; // Trading pairs
  timeframes: string[]; // e.g., ['1h', '4h']
  timerange: string; // e.g., '20240101-20240601'
  status: BacktestJobStatus;
  startedAt?: number; // Unix timestamp
  completedAt?: number; // Unix timestamp
  errorMessage?: string;
  resultId?: string; // Links to stored result
}

export interface BacktestMetrics {
  totalProfit: number;
  totalProfitPct: number;
  annualReturn: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  winRate: number;
  profitFactor: number;
  tradeCount: number;
  avgHoldingTime: number; // minutes
  maxConsecutiveLoss: number;
  bestPair: { pair: string; profit: number };
  worstPair: { pair: string; profit: number };
  capitalUtilization: number; // 0-1
}

export interface BacktestResult {
  id: string; // UUID
  jobId: string;
  strategyName: string;
  timeframe: string;
  timerange: string;
  pairs: string[];
  metrics: BacktestMetrics;
  equityCurve: { date: string; equity: number }[];
  pairResults: {
    pair: string;
    profit: number;
    profitPct: number;
    trades: number;
    winRate: number;
    drawdown: number;
  }[];
  createdAt: number;
}
