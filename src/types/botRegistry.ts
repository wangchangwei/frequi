/**
 * Bot Registry Types
 * Phase 1 MVP: Multi-bot registration and management
 */

export type BotMode = 'dry_run' | 'live';
export type BotStatus = 'online' | 'offline' | 'error' | 'unknown';

export interface BotTag {
  id: string;
  name: string;
  color?: string;
}

export interface BotGroup {
  id: string;
  name: string;
  description?: string;
}

export interface BotRegistryEntry {
  /** Unique bot identifier (matches ftbot botId) */
  botId: string;
  /** Display name for the bot */
  name: string;
  /** Exchange name (e.g., 'binance', 'bybit') */
  exchange: string;
  /** Associated account ID (references accountStore) */
  accountId?: string;
  /** Associated strategy name */
  strategyId?: string;
  /** Associated config ID */
  configId?: string;
  /** Bot run mode */
  mode: BotMode;
  /** Freqtrade API URL (e.g., http://localhost:8080) */
  apiUrl: string;
  /** Native FreqUI URL for deep-link (e.g., http://localhost:8080) */
  freqUiUrl: string;
  /** Tags for grouping/filtering */
  tags: BotTag[];
  /** Bot group ID */
  groupId?: string;
  /** Current operational status */
  status: BotStatus;
  /** Sort order */
  sortId?: number;
  /** Last health check timestamp */
  lastHealthCheck?: number;
  /** Creation timestamp */
  createdAt: number;
  /** Notes */
  notes?: string;
}

export interface BotHealthStatus {
  botId: string;
  isOnline: boolean;
  lastPing: number;
  latencyMs?: number;
  error?: string;
}

export interface BotRegistryState {
  bots: BotRegistryEntry[];
  groups: BotGroup[];
  tags: BotTag[];
  lastHealthCheckAll: number;
}

export interface BotActionResult {
  botId: string;
  success: boolean;
  message?: string;
  error?: string;
}
