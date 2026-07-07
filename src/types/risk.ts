export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskActionType =
  | 'stopbuy'
  | 'pause'
  | 'force_exit'
  | 'blacklist'
  | 'lock_pair'
  | 'restart'
  | 'alert';
export type RiskScope = 'bot' | 'account' | 'coin' | 'market';

export interface RiskRule {
  id: string;
  name: string;
  scope: RiskScope; // Per-bot, per-account, per-coin, market-level
  scopeTarget?: string; // botId, accountId, or coin symbol
  condition: string; // Human-readable description
  threshold: number;
  action: RiskActionType;
  actionTarget?: string; // For blacklist/lock: which pair
  enabled: boolean;
  triggeredCount: number;
  lastTriggeredAt?: number;
  createdAt: number;
}

export interface RiskEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  scope: RiskScope;
  scopeTarget: string;
  action: RiskActionType;
  triggeredAt: number;
  resolved: boolean;
  resolvedAt?: number;
  details: string;
}

export interface RiskExposure {
  botId?: string;
  accountId?: string;
  coin?: string;
  currentExposure: number;
  maxExposure: number;
  exposurePct: number; // 0-1
  updatedAt: number;
}
