/**
 * Account Types
 * Phase 2: Exchange account registry with encrypted credentials
 */

export type AccountType = 'spot' | 'margin' | 'futures' | 'funding';

export type AccountRiskLevel = 'low' | 'medium' | 'high';

/** Balance snapshot for an account */
export interface AccountBalance {
  /** Total equity in stake currency */
  total: number;
  /** Free balance */
  free: number;
  /** Used/Locked balance */
  used: number;
  /** Estimated value in fiat */
  valueFiat: number;
  /** Stake currency */
  stakeCurrency: string;
  /** Fiat currency */
  fiatCurrency: string;
  /** Last updated timestamp */
  updatedAt: number;
}

/** Exposure tracking for an account */
export interface AccountExposure {
  /** Total exposure as ratio (e.g., 0.5 = 50%) */
  totalExposureRatio: number;
  /** Per-pair exposure breakdown */
  perPairExposure: Record<string, number>;
  /** Per-side exposure (long/short) */
  longExposure: number;
  shortExposure: number;
  /** Leverage used (1 = no leverage) */
  leverage: number;
  /** Last updated timestamp */
  updatedAt: number;
}

/** Exchange account registry entry */
export interface ExchangeAccount {
  /** Unique account identifier */
  accountId: string;
  /** Display name */
  name: string;
  /** Exchange name (e.g., 'binance', 'bybit', 'okx') */
  exchange: string;
  /** Account type */
  type: AccountType;
  /** Account subtype (e.g., 'usdt-m', 'coin-m') */
  subtype?: string;
  /** API Key (encrypted, stored) */
  apiKeyEncrypted: string;
  /** API Secret (encrypted, stored) */
  apiSecretEncrypted: string;
  /** Password/passphrase if required (encrypted) */
  passwordEncrypted?: string;
  /** Additional exchange-specific credentials (encrypted) */
  extraEncrypted?: string;
  /** Optional balance snapshot */
  balance?: AccountBalance;
  /** Optional exposure data */
  exposure?: AccountExposure;
  /** Risk level */
  riskLevel: AccountRiskLevel;
  /** Notes */
  notes?: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
}

/** Account creation input (without auto-generated fields) */
export type CreateAccountInput = Omit<
  ExchangeAccount,
  | 'accountId'
  | 'createdAt'
  | 'updatedAt'
  | 'apiKeyEncrypted'
  | 'apiSecretEncrypted'
  | 'passwordEncrypted'
  | 'extraEncrypted'
> & {
  /** Plaintext API key (encrypted before storage) */
  apiKey: string;
  /** Plaintext API secret (encrypted before storage) */
  apiSecret: string;
  /** Plaintext password (encrypted before storage) */
  password?: string;
  /** Plaintext extra data (encrypted before storage) */
  extra?: string;
};

/** Account update input */
export type UpdateAccountInput = Partial<Omit<ExchangeAccount, 'accountId' | 'createdAt'>>;
