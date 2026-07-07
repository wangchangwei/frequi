/**
 * Strategy Asset Types
 * Phase 2: Strategy registry with version history and risk tracking
 */

export type StrategyRiskLevel = 'low' | 'medium' | 'high' | 'extreme';

/** A single version of a strategy */
export interface StrategyVersion {
  /** Version identifier (e.g., 'v1.0.0' or git hash) */
  versionId: string;
  /** Strategy name */
  strategyName: string;
  /** File hash (SHA256) */
  fileHash: string;
  /** File path in the bot's strategy directory */
  filePath: string;
  /** Strategy parameters (JSON string) */
  parameters?: string;
  /** Changelog / notes for this version */
  changelog?: string;
  /** Is this the current active version */
  isActive: boolean;
  /** Timestamp when this version was registered */
  createdAt: number;
}

/** Linked bot reference */
export interface StrategyBotLink {
  /** Bot ID (references botRegistry) */
  botId: string;
  /** Bot display name */
  botName: string;
  /** When the link was created */
  linkedAt: number;
}

/** Linked backtest reference */
export interface StrategyBacktestLink {
  /** Backtest ID */
  backtestId: string;
  /** Backtest name/label */
  label: string;
  /** Final profit ratio */
  profitRatio?: number;
  /** When linked */
  linkedAt: number;
}

/** Strategy asset registry entry */
export interface StrategyAsset {
  /** Unique strategy identifier */
  strategyId: string;
  /** Strategy display name */
  name: string;
  /** Strategy class name (as known by Freqtrade) */
  strategyName: string;
  /** Version history */
  versions: StrategyVersion[];
  /** Current active version */
  currentVersionId: string;
  /** Risk level assessment */
  riskLevel: StrategyRiskLevel;
  /** File hash of current version */
  currentFileHash: string;
  /** Description */
  description?: string;
  /** Tags for categorization */
  tags: string[];
  /** Linked bots using this strategy */
  linkedBots: StrategyBotLink[];
  /** Linked backtests for this strategy */
  linkedBacktests: StrategyBacktestLink[];
  /** Notes */
  notes?: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
}

/** Strategy creation input */
export type CreateStrategyInput = Pick<
  StrategyAsset,
  'name' | 'strategyName' | 'description' | 'tags' | 'notes' | 'riskLevel'
> & {
  /** Initial version info */
  initialVersion: Omit<StrategyVersion, 'createdAt' | 'filePath'> & { filePath?: string };
};

/** Strategy update input */
export type UpdateStrategyInput = Partial<
  Pick<
    StrategyAsset,
    | 'name'
    | 'strategyName'
    | 'description'
    | 'tags'
    | 'notes'
    | 'riskLevel'
    | 'currentVersionId'
    | 'currentFileHash'
  >
>;

/** New version input */
export type AddVersionInput = Pick<
  StrategyVersion,
  'versionId' | 'strategyName' | 'fileHash' | 'filePath' | 'parameters' | 'changelog'
>;
