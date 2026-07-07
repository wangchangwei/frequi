<script setup lang="ts">
/**
 * Bot Detail View
 * Phase 1 MVP: Per-bot detail with actions and FreqUI deep-link
 */
import type { BotRegistryEntry, BotStatus } from '@/types/botRegistry';
import { useBotRegistryStore } from '@/stores/botRegistry';

const route = useRoute();
const router = useRouter();
const botRegistryStore = useBotRegistryStore();
const botStore = useBotStore();

const botId = computed(() => route.params.id as string);

const bot = computed<BotRegistryEntry | undefined>(() => botRegistryStore.getBot(botId.value));

const subStore = computed(() => botStore.botStores[botId.value]);

const isRunning = computed(() => subStore.value?.botState?.state === 'running');
const botName = computed(() => bot.value?.name ?? botId.value);

const stats = computed(() => {
  if (!subStore.value) return null;
  const profit = subStore.value.profit;
  const openTrades = subStore.value.openTrades;
  const trades = subStore.value.trades;
  return {
    profit: profit?.profit_closed_fiat ?? 0,
    openTradeCount: openTrades?.length ?? 0,
    totalTrades: trades?.length ?? 0,
    balance: subStore.value.balance,
    botState: subStore.value.botState,
  };
});

// Actions
async function handleStart() {
  await botRegistryStore.startBot(botId.value);
}

async function handleStop() {
  await botRegistryStore.stopBot(botId.value);
}

async function handleStopBuy() {
  await botRegistryStore.stopBuyBot(botId.value);
}

async function handleRestart() {
  await botRegistryStore.restartBot(botId.value);
}

function openFreqUI() {
  const url = bot.value?.freqUiUrl;
  if (url) {
    window.open(url, '_blank');
  }
}

function getStatusColor(status: BotStatus): 'success' | 'error' | 'warning' | 'neutral' {
  switch (status) {
    case 'online':
      return 'success';
    case 'offline':
      return 'error';
    case 'error':
      return 'error';
    default:
      return 'warning';
  }
}

function getStatusLabel(status: BotStatus): string {
  switch (status) {
    case 'online':
      return '在线';
    case 'offline':
      return '离线';
    case 'error':
      return '错误';
    default:
      return '未知';
  }
}

// Refresh on mount
onMounted(async () => {
  if (subStore.value) {
    await subStore.value.refreshSlow(true);
  }
});
</script>

<template>
  <div v-if="bot" class="p-4 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <UButton variant="ghost" icon="mdi-arrow-left" @click="router.back()" />
        <div>
          <h1 class="text-2xl font-bold">{{ botName }}</h1>
          <div class="flex gap-2 mt-1">
            <UBadge :color="getStatusColor(bot.status)" variant="soft">
              {{ getStatusLabel(bot.status) }}
            </UBadge>
            <UBadge color="neutral" variant="outline">
              {{ bot.exchange }}
            </UBadge>
            <UBadge :color="bot.mode === 'live' ? 'error' : 'success'" variant="soft">
              {{ bot.mode === 'live' ? '实盘' : '模拟' }}
            </UBadge>
          </div>
        </div>
      </div>
      <UButton
        color="primary"
        variant="outline"
        icon="mdi-open-in-new"
        label="打开 FreqUI"
        @click="openFreqUI"
      />
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-3 mb-6">
      <UButton
        v-if="!isRunning"
        color="success"
        icon="mdi-play"
        label="启动"
        @click="handleStart"
      />
      <UButton v-else color="warning" icon="mdi-stop" label="停止" @click="handleStop" />
      <UButton
        color="warning"
        variant="soft"
        icon="mdi-pause"
        label="停止买入"
        @click="handleStopBuy"
      />
      <UButton
        color="neutral"
        variant="soft"
        icon="mdi-refresh"
        label="重启"
        @click="handleRestart"
      />
      <UButton
        color="neutral"
        variant="soft"
        icon="mdi-refresh"
        label="刷新数据"
        @click="subStore?.refreshSlow(true)"
      />
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <UCard>
        <div class="text-sm text-neutral-500">累计收益</div>
        <div class="text-2xl font-bold">
          {{ stats?.profit?.toFixed(2) ?? '—' }}
          <span class="text-sm font-normal">{{
            botStore.botStores[botId]?.stakeCurrency ?? ''
          }}</span>
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-neutral-500">未平仓位</div>
        <div class="text-2xl font-bold">{{ stats?.openTradeCount ?? 0 }}</div>
      </UCard>
      <UCard>
        <div class="text-sm text-neutral-500">总交易数</div>
        <div class="text-2xl font-bold">{{ stats?.totalTrades ?? 0 }}</div>
      </UCard>
      <UCard>
        <div class="text-sm text-neutral-500">机器人状态</div>
        <div class="text-2xl font-bold">
          {{ stats?.botState?.state ?? '—' }}
        </div>
      </UCard>
    </div>

    <!-- Bot Info -->
    <UCard class="mb-6">
      <template #header>
        <span class="font-semibold">机器人信息</span>
      </template>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-neutral-500">Bot ID:</span>
          <span class="ml-2">{{ bot.botId }}</span>
        </div>
        <div>
          <span class="text-neutral-500">API URL:</span>
          <span class="ml-2">{{ bot.apiUrl }}</span>
        </div>
        <div>
          <span class="text-neutral-500">FreqUI URL:</span>
          <span class="ml-2">{{ bot.freqUiUrl }}</span>
        </div>
        <div>
          <span class="text-neutral-500">运行模式:</span>
          <span class="ml-2">{{ bot.mode === 'live' ? '实盘' : '模拟' }}</span>
        </div>
        <div v-if="bot.accountId">
          <span class="text-neutral-500">账户:</span>
          <span class="ml-2">{{ bot.accountId }}</span>
        </div>
        <div v-if="bot.strategyId">
          <span class="text-neutral-500">策略:</span>
          <span class="ml-2">{{ bot.strategyId }}</span>
        </div>
        <div>
          <span class="text-neutral-500">最后健康检查:</span>
          <span class="ml-2">
            {{ bot.lastHealthCheck ? new Date(bot.lastHealthCheck).toLocaleString() : '—' }}
          </span>
        </div>
        <div>
          <span class="text-neutral-500">注册时间:</span>
          <span class="ml-2">{{ new Date(bot.createdAt).toLocaleString() }}</span>
        </div>
      </div>
      <div v-if="bot.notes" class="mt-4">
        <span class="text-neutral-500 text-sm">备注:</span>
        <p class="mt-1 text-sm">{{ bot.notes }}</p>
      </div>
    </UCard>

    <!-- Open Trades -->
    <UCard v-if="subStore?.openTrades?.length">
      <template #header>
        <span class="font-semibold">未平仓位 ({{ subStore.openTrades.length }})</span>
      </template>
      <TradeList active-trades :trades="subStore.openTrades" />
    </UCard>
  </div>

  <!-- Bot not found -->
  <div v-else class="text-center py-20">
    <i-mdi-robot-outline class="text-6xl mb-4 text-neutral-500" />
    <h2 class="text-xl font-bold mb-2">机器人未找到</h2>
    <p class="text-neutral-500 mb-4">Bot ID: {{ botId }}</p>
    <UButton color="primary" label="返回列表" @click="router.push('/bots')" />
  </div>
</template>
