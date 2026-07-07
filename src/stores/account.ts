/**
 * Account Store
 * Phase 2: Exchange account registry with encrypted credentials
 */
import type {
  AccountBalance,
  AccountExposure,
  CreateAccountInput,
  ExchangeAccount,
  UpdateAccountInput,
} from '@/types/account';
import { encrypt, decrypt, maskSecret } from '@/utils/crypto';

export const useAccountStore = defineStore(
  'account',
  () => {
    const accounts = ref<ExchangeAccount[]>([]);

    const sessionPassphrase = ref<string | null>(null);

    const accountMap = computed<Record<string, ExchangeAccount>>(() => {
      const map: Record<string, ExchangeAccount> = {};
      accounts.value.forEach((acc: ExchangeAccount) => {
        map[acc.accountId] = acc;
      });
      return map;
    });

    const accountCount = computed(() => accounts.value.length);

    const accountsByExchange = computed<Record<string, ExchangeAccount[]>>(() => {
      const result: Record<string, ExchangeAccount[]> = {};
      accounts.value.forEach((acc: ExchangeAccount) => {
        if (!result[acc.exchange]) {
          result[acc.exchange] = [];
        }
        result[acc.exchange]!.push(acc);
      });
      return result;
    });

    function setSessionPassphrase(passphrase: string): void {
      sessionPassphrase.value = passphrase;
    }

    function clearSessionPassphrase(): void {
      sessionPassphrase.value = null;
    }

    async function addAccount(input: CreateAccountInput): Promise<ExchangeAccount> {
      if (!sessionPassphrase.value) {
        throw new Error('Session passphrase not set. Call setSessionPassphrase() first.');
      }

      const passphrase = sessionPassphrase.value;

      const [apiKeyEncrypted, apiSecretEncrypted, passwordEncrypted, extraEncrypted] =
        await Promise.all([
          encrypt(input.apiKey, passphrase),
          encrypt(input.apiSecret, passphrase),
          input.password ? encrypt(input.password, passphrase) : Promise.resolve(undefined),
          input.extra ? encrypt(input.extra, passphrase) : Promise.resolve(undefined),
        ]);

      const now = Date.now();
      const account: ExchangeAccount = {
        accountId: `acc_${now}`,
        name: input.name,
        exchange: input.exchange,
        type: input.type,
        subtype: input.subtype,
        apiKeyEncrypted,
        apiSecretEncrypted,
        passwordEncrypted,
        extraEncrypted,
        riskLevel: input.riskLevel,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      };

      accounts.value.push(account);
      return account;
    }

    async function updateAccount(
      accountId: string,
      updates: UpdateAccountInput,
      newCredentials?: { apiKey?: string; apiSecret?: string; password?: string; extra?: string },
    ): Promise<void> {
      if (!sessionPassphrase.value) {
        throw new Error('Session passphrase not set. Call setSessionPassphrase() first.');
      }

      const index = accounts.value.findIndex((acc: ExchangeAccount) => acc.accountId === accountId);
      if (index === -1) {
        throw new Error(`Account ${accountId} not found`);
      }

      const existing = accounts.value[index];
      const passphrase = sessionPassphrase.value;

      let apiKeyEncrypted = existing.apiKeyEncrypted;
      let apiSecretEncrypted = existing.apiSecretEncrypted;
      let passwordEncrypted = existing.passwordEncrypted;
      let extraEncrypted = existing.extraEncrypted;

      if (newCredentials) {
        if (newCredentials.apiKey) {
          apiKeyEncrypted = await encrypt(newCredentials.apiKey, passphrase);
        }
        if (newCredentials.apiSecret) {
          apiSecretEncrypted = await encrypt(newCredentials.apiSecret, passphrase);
        }
        if (newCredentials.password) {
          passwordEncrypted = await encrypt(newCredentials.password, passphrase);
        }
        if (newCredentials.extra) {
          extraEncrypted = await encrypt(newCredentials.extra, passphrase);
        }
      }

      accounts.value[index] = {
        ...existing,
        ...updates,
        apiKeyEncrypted,
        apiSecretEncrypted,
        passwordEncrypted,
        extraEncrypted,
        updatedAt: Date.now(),
      };
    }

    function removeAccount(accountId: string): void {
      const idx = accounts.value.findIndex((acc: ExchangeAccount) => acc.accountId === accountId);
      if (idx !== -1) {
        accounts.value.splice(idx, 1);
      }
    }

    function getAccount(accountId: string): ExchangeAccount | undefined {
      return accountMap.value[accountId];
    }

    function updateBalance(accountId: string, balance: AccountBalance): void {
      const idx = accounts.value.findIndex((acc: ExchangeAccount) => acc.accountId === accountId);
      if (idx !== -1) {
        accounts.value[idx] = {
          ...accounts.value[idx],
          balance,
          updatedAt: Date.now(),
        };
      }
    }

    function updateExposure(accountId: string, exposure: AccountExposure): void {
      const idx = accounts.value.findIndex((acc: ExchangeAccount) => acc.accountId === accountId);
      if (idx !== -1) {
        accounts.value[idx] = {
          ...accounts.value[idx],
          exposure,
          updatedAt: Date.now(),
        };
      }
    }

    async function getDecryptedApiKey(accountId: string): Promise<string> {
      if (!sessionPassphrase.value) {
        throw new Error('Session passphrase not set');
      }
      const acc = getAccount(accountId);
      if (!acc) throw new Error(`Account ${accountId} not found`);
      return decrypt(acc.apiKeyEncrypted, sessionPassphrase.value);
    }

    async function getDecryptedApiSecret(accountId: string): Promise<string> {
      if (!sessionPassphrase.value) {
        throw new Error('Session passphrase not set');
      }
      const acc = getAccount(accountId);
      if (!acc) throw new Error(`Account ${accountId} not found`);
      return decrypt(acc.apiSecretEncrypted, sessionPassphrase.value);
    }

    async function getMaskedApiKey(accountId: string): Promise<string> {
      const acc = getAccount(accountId);
      if (!acc) throw new Error(`Account ${accountId} not found`);
      return maskSecret(acc.apiKeyEncrypted.slice(-20));
    }

    function hasCredentials(accountId: string): boolean {
      const acc = getAccount(accountId);
      return !!acc?.apiKeyEncrypted && !!acc.apiSecretEncrypted;
    }

    return {
      accounts,
      sessionPassphrase,
      accountMap,
      accountCount,
      accountsByExchange,
      setSessionPassphrase,
      clearSessionPassphrase,
      addAccount,
      updateAccount,
      removeAccount,
      getAccount,
      updateBalance,
      updateExposure,
      getDecryptedApiKey,
      getDecryptedApiSecret,
      getMaskedApiKey,
      hasCredentials,
    };
  },
  {
    persist: {
      key: 'frequi-account-store',
      pick: ['accounts'],
    } as const,
  },
);
