/**
 * Bot Registry Store
 * Phase 1 MVP: Manages registered bots, health checks, and per-bot actions
 */
import type {
  BotActionResult,
  BotGroup,
  BotHealthStatus,
  BotRegistryEntry,
  BotStatus,
  BotTag,
} from '@/types/botRegistry';
import { useBotStore } from './ftbotwrapper';

const HEALTH_CHECK_INTERVAL = 60000; // 60 seconds

export const useBotRegistryStore = defineStore(
  'botRegistry',
  () => {
    // State
    const bots = ref<BotRegistryEntry[]>([]);
    const groups = ref<BotGroup[]>([]);
    const tags = ref<BotTag[]>([]);
    const lastHealthCheckAll = ref<number>(0);
    const healthStatuses = ref<Record<string, BotHealthStatus>>({});

    // Health check interval handle
    let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

    // Computed
    const botMap = computed<Record<string, BotRegistryEntry>>(() => {
      const map: Record<string, BotRegistryEntry> = {};
      bots.value.forEach((bot) => {
        map[bot.botId] = bot;
      });
      return map;
    });

    const onlineBots = computed(() => bots.value.filter((b) => b.status === 'online'));
    const offlineBots = computed(() => bots.value.filter((b) => b.status === 'offline'));
    const errorBots = computed(() => bots.value.filter((b) => b.status === 'error'));

    const runningBots = computed(() => {
      const botStore = useBotStore();
      return bots.value.filter((b) => {
        const subStore = botStore.botStores[b.botId];
        return subStore?.botState?.state === 'running';
      });
    });

    const stoppedBots = computed(() => {
      const botStore = useBotStore();
      return bots.value.filter((b) => {
        const subStore = botStore.botStores[b.botId];
        return subStore?.botState?.state === 'stopped';
      });
    });

    const botCount = computed(() => bots.value.length);
    const onlineCount = computed(() => onlineBots.value.length);
    const runningCount = computed(() => runningBots.value.length);

    // Actions

    function addBot(bot: Omit<BotRegistryEntry, 'createdAt' | 'lastHealthCheck' | 'status'>): void {
      const entry: BotRegistryEntry = {
        ...bot,
        status: 'unknown',
        createdAt: Date.now(),
      };
      bots.value.push(entry);
    }

    function updateBot(botId: string, updates: Partial<BotRegistryEntry>): void {
      const index = bots.value.findIndex((b) => b.botId === botId);
      if (index !== -1) {
        bots.value[index] = { ...bots.value[index], ...updates };
      }
    }

    function removeBot(botId: string): void {
      const index = bots.value.findIndex((b) => b.botId === botId);
      if (index !== -1) {
        bots.value.splice(index, 1);
        delete healthStatuses.value[botId];
      }
    }

    function getBot(botId: string): BotRegistryEntry | undefined {
      return botMap.value[botId];
    }

    function setBotStatus(botId: string, status: BotStatus): void {
      updateBot(botId, { status, lastHealthCheck: Date.now() });
    }

    // Health check - ping a single bot
    async function healthCheckBot(botId: string): Promise<BotHealthStatus> {
      const botStore = useBotStore();
      const subStore = botStore.botStores[botId];
      const start = Date.now();

      if (!subStore) {
        const result: BotHealthStatus = {
          botId,
          isOnline: false,
          lastPing: Date.now(),
          error: 'Bot not registered in ftbot store',
        };
        healthStatuses.value[botId] = result;
        setBotStatus(botId, 'offline');
        return result;
      }

      try {
        await subStore.fetchPing();
        const result: BotHealthStatus = {
          botId,
          isOnline: subStore.isBotOnline,
          lastPing: Date.now(),
          latencyMs: Date.now() - start,
        };
        healthStatuses.value[botId] = result;
        setBotStatus(botId, subStore.isBotOnline ? 'online' : 'offline');
        return result;
      } catch {
        const result: BotHealthStatus = {
          botId,
          isOnline: false,
          lastPing: Date.now(),
          error: 'Health check failed',
        };
        healthStatuses.value[botId] = result;
        setBotStatus(botId, 'error');
        return result;
      }
    }

    // Health check all registered bots
    async function healthCheckAll(): Promise<void> {
      const checks = bots.value.map((bot) => healthCheckBot(bot.botId));
      await Promise.allSettled(checks);
      lastHealthCheckAll.value = Date.now();
    }

    // Start periodic health checks
    function startHealthChecks(): void {
      if (healthCheckInterval) {
        return;
      }
      // Initial check
      healthCheckAll();
      // Periodic check
      healthCheckInterval = setInterval(() => {
        healthCheckAll();
      }, HEALTH_CHECK_INTERVAL);
    }

    // Stop periodic health checks
    function stopHealthChecks(): void {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
      }
    }

    // Per-bot actions via ftbotwrapper
    async function startBot(botId: string): Promise<BotActionResult> {
      const botStore = useBotStore();
      const subStore = botStore.botStores[botId];
      if (!subStore) {
        return { botId, success: false, error: 'Bot not found in store' };
      }
      try {
        await subStore.startBot();
        return { botId, success: true, message: 'Bot started' };
      } catch (err) {
        return { botId, success: false, error: String(err) };
      }
    }

    async function stopBot(botId: string): Promise<BotActionResult> {
      const botStore = useBotStore();
      const subStore = botStore.botStores[botId];
      if (!subStore) {
        return { botId, success: false, error: 'Bot not found in store' };
      }
      try {
        await subStore.stopBot();
        return { botId, success: true, message: 'Bot stopped' };
      } catch (err) {
        return { botId, success: false, error: String(err) };
      }
    }

    async function stopBuyBot(botId: string): Promise<BotActionResult> {
      const botStore = useBotStore();
      const subStore = botStore.botStores[botId];
      if (!subStore) {
        return { botId, success: false, error: 'Bot not found in store' };
      }
      try {
        await subStore.stopBuy();
        return { botId, success: true, message: 'Stopbuy executed' };
      } catch (err) {
        return { botId, success: false, error: String(err) };
      }
    }

    async function restartBot(botId: string): Promise<BotActionResult> {
      const botStore = useBotStore();
      const subStore = botStore.botStores[botId];
      if (!subStore) {
        return { botId, success: false, error: 'Bot not found in store' };
      }
      try {
        await subStore.reloadConfig();
        return { botId, success: true, message: 'Config reloaded (restart)' };
      } catch (err) {
        return { botId, success: false, error: String(err) };
      }
    }

    // Group management
    function addGroup(group: Omit<BotGroup, 'id'>): void {
      const id = `group_${Date.now()}`;
      groups.value.push({ id, ...group });
    }

    function updateGroup(groupId: string, updates: Partial<BotGroup>): void {
      const index = groups.value.findIndex((g) => g.id === groupId);
      if (index !== -1) {
        groups.value[index] = { ...groups.value[index], ...updates };
      }
    }

    function removeGroup(groupId: string): void {
      const index = groups.value.findIndex((g) => g.id === groupId);
      if (index !== -1) {
        groups.value.splice(index, 1);
        // Unassign bots from this group
        bots.value.forEach((bot) => {
          if (bot.groupId === groupId) {
            updateBot(bot.botId, { groupId: undefined });
          }
        });
      }
    }

    // Tag management
    function addTag(tag: Omit<BotTag, 'id'>): void {
      const id = `tag_${Date.now()}`;
      tags.value.push({ id, ...tag });
    }

    function updateTag(tagId: string, updates: Partial<BotTag>): void {
      const index = tags.value.findIndex((t) => t.id === tagId);
      if (index !== -1) {
        tags.value[index] = { ...tags.value[index], ...updates };
      }
    }

    function removeTag(tagId: string): void {
      const index = tags.value.findIndex((t) => t.id === tagId);
      if (index !== -1) {
        tags.value.splice(index, 1);
        // Remove tag from all bots
        bots.value.forEach((bot) => {
          updateBot(bot.botId, { tags: bot.tags.filter((t) => t.id !== tagId) });
        });
      }
    }

    return {
      // State
      bots,
      groups,
      tags,
      lastHealthCheckAll,
      healthStatuses,
      // Computed
      botMap,
      onlineBots,
      offlineBots,
      errorBots,
      runningBots,
      stoppedBots,
      botCount,
      onlineCount,
      runningCount,
      // Actions
      addBot,
      updateBot,
      removeBot,
      getBot,
      setBotStatus,
      healthCheckBot,
      healthCheckAll,
      startHealthChecks,
      stopHealthChecks,
      startBot,
      stopBot,
      stopBuyBot,
      restartBot,
      addGroup,
      updateGroup,
      removeGroup,
      addTag,
      updateTag,
      removeTag,
    };
  },
  {
    persist: {
      key: 'frequi-bot-registry',
      pick: ['bots', 'groups', 'tags'],
    },
  },
);
