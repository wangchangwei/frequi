/**
 * Hyperopt Center Types
 * Phase 6: Hyperparameter optimization interface
 */

export interface HyperoptSpace {
  key: string; // 'stoploss' | 'roi' | 'period' | 'timing' | 'exit' | 'entry' | 'all'
  label: string;
  description: string;
}

export interface HyperoptParameter {
  name: string;
  value: number;
  optimized: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export interface HyperoptResult {
  id: string;
  strategy: string;
  lossFunction: string;
  runs: number;
  totalRuns: number;
  bestResult?: HyperoptParameter[];
  bestLoss?: number;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  startTime: number;
  endTime?: number;
  progress: number; // 0-100
}

export interface HyperoptPayload {
  strategy: string;
  spaces: string[]; // e.g. ['stoploss', 'roi']
  loss_function: string;
  epochs?: number;
  min_trade_number?: number;
  timerange?: string;
}

export const availableSpaces: HyperoptSpace[] = [
  { key: 'all', label: 'All', description: 'Optimize all spaces' },
  { key: 'stoploss', label: 'Stoploss', description: 'Stop loss range' },
  { key: 'roi', label: 'ROI', description: 'ROI table optimization' },
  { key: 'period', label: 'Period', description: 'Time period settings' },
  { key: 'timing', label: 'Timing', description: 'Entry/exit timing' },
  { key: 'exit', label: 'Exit', description: 'Exit signal parameters' },
  { key: 'entry', label: 'Entry', description: 'Entry signal parameters' },
];
