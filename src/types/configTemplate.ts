/**
 * Config Template Types
 * Phase 3: Templated, versioned config system for Freqtrade
 */

export type ConfigCategory = 'strategy-run' | 'exchange' | 'pairlist' | 'risk';

/** A single version of a config template snapshot */
export interface ConfigVersion {
  /** Unique version ID */
  id: string;
  /** Parent template ID */
  templateId: string;
  /** Version number (e.g., 1, 2, 3) */
  version: number;
  /** Content snapshot as key-value record */
  content: Record<string, any>;
  /** When this version was created */
  createdAt: number;
  /** Who/what created this version */
  createdBy: string;
  /** Whether this version is locked from editing */
  isLocked: boolean;
  /** Whether this version is marked as production */
  isProduction: boolean;
  /** Changelog / release notes */
  changelog?: string;
}

/** A config template entry */
export interface ConfigTemplate {
  /** Unique template ID */
  id: string;
  /** Template display name */
  name: string;
  /** Category */
  category: ConfigCategory;
  /** Description */
  description?: string;
  /** Default parameters */
  parameters: Record<string, any>;
  /** Dry-run specific parameters */
  dryRunParams: Record<string, any>;
  /** Live trading parameters */
  liveParams: Record<string, any>;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
  /** Tags for categorization */
  tags: string[];
}

/** Input for creating a new template */
export interface ConfigTemplateInput {
  name: string;
  category: ConfigCategory;
  description?: string;
  parameters: Record<string, any>;
  dryRunParams: Record<string, any>;
  liveParams: Record<string, any>;
  tags: string[];
}

/** Input for creating a new version */
export interface ConfigVersionInput {
  content: Record<string, any>;
  changelog?: string;
  isProduction: boolean;
}

/** Diff line result */
export interface ConfigDiffLine {
  key: string;
  type: 'added' | 'removed' | 'changed';
  oldValue?: any;
  newValue?: any;
}
