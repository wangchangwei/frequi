<script setup lang="ts">
/**
 * Bot Registry View
 * Phase 1 MVP: Manage registered bots - list, add, edit, remove
 */
import type { BotRegistryEntry, BotStatus } from '@/types/botRegistry';
import { useBotRegistryStore } from '@/stores/botRegistry';

const botRegistryStore = useBotRegistryStore();
const router = useRouter();

// Dialog state
const showAddDialog = ref(false);
const showEditDialog = ref(false);
const editingBot = ref<BotRegistryEntry | null>(null);

// Form state
const addFormRef = ref<HTMLFormElement>();
const editFormRef = ref<HTMLFormElement>();
const form = ref({
  botId: '',
  name: '',
  exchange: '',
  mode: 'dry_run' as 'dry_run' | 'live',
  apiUrl: '',
  freqUiUrl: '',
  accountId: '',
  strategyId: '',
  notes: '',
});

// Filters
const statusFilter = ref<BotStatus | 'all'>('all');
const searchQuery = ref('');

const filteredBots = computed(() => {
  let result = botRegistryStore.bots;
  if (statusFilter.value !== 'all') {
    result = result.filter((b) => b.status === statusFilter.value);
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.botId.toLowerCase().includes(q) ||
        b.exchange.toLowerCase().includes(q),
    );
  }
  return result;
});

const statusOptions = [
  { value: 'all', label: '全部' },
  { value: 'online', label: '在线' },
  { value: 'offline', label: '离线' },
  { value: 'error', label: '错误' },
  { value: 'unknown', label: '未知' },
];

const modeOptions = [
  { value: 'dry_run', label: '模拟交易 (Dry-run)' },
  { value: 'live', label: '实盘 (Live)' },
];

function openAddDialog() {
  form.value = {
    botId: `bot_${Date.now()}`,
    name: '',
    exchange: '',
    mode: 'dry_run',
    apiUrl: '',
    freqUiUrl: '',
    accountId: '',
    strategyId: '',
    notes: '',
  };
  showAddDialog.value = true;
}

function openEditDialog(bot: BotRegistryEntry) {
  editingBot.value = bot;
  form.value = {
    botId: bot.botId,
    name: bot.name,
    exchange: bot.exchange,
    mode: bot.mode,
    apiUrl: bot.apiUrl,
    freqUiUrl: bot.freqUiUrl,
    accountId: bot.accountId ?? '',
    strategyId: bot.strategyId ?? '',
    notes: bot.notes ?? '',
  };
  showEditDialog.value = true;
}

function closeDialog() {
  showAddDialog.value = false;
  showEditDialog.value = false;
  editingBot.value = null;
}

function validateForm(): boolean {
  return !!(form.value.name.trim() && form.value.exchange.trim() && form.value.apiUrl.trim());
}

async function handleAddBot() {
  if (!validateForm()) return;

  // Auto-set freqUiUrl to apiUrl if not provided
  const freqUiUrl = form.value.freqUiUrl.trim() || form.value.apiUrl.trim();

  botRegistryStore.addBot({
    botId: form.value.botId,
    name: form.value.name.trim(),
    exchange: form.value.exchange.trim(),
    mode: form.value.mode,
    apiUrl: form.value.apiUrl.trim(),
    freqUiUrl,
    tags: [],
    accountId: form.value.accountId.trim() || undefined,
    strategyId: form.value.strategyId.trim() || undefined,
    notes: form.value.notes.trim() || undefined,
  });

  showAlert(`机器人 ${form.value.name} 已添加`);
  closeDialog();
}

async function handleUpdateBot() {
  if (!editingBot.value || !validateForm()) return;

  const freqUiUrl = form.value.freqUiUrl.trim() || form.value.apiUrl.trim();

  botRegistryStore.updateBot(editingBot.value.botId, {
    name: form.value.name.trim(),
    exchange: form.value.exchange.trim(),
    mode: form.value.mode,
    apiUrl: form.value.apiUrl.trim(),
    freqUiUrl,
    accountId: form.value.accountId.trim() || undefined,
    strategyId: form.value.strategyId.trim() || undefined,
    notes: form.value.notes.trim() || undefined,
  });

  showAlert(`机器人 ${form.value.name} 已更新`);
  closeDialog();
}

async function handleDeleteBot(bot: BotRegistryEntry) {
  const { confirm } = useConfirmBox();
  if (
    await confirm({
      title: '删除确认',
      message: `确定要删除机器人 ${bot.name} (${bot.botId}) 吗？`,
    })
  ) {
    botRegistryStore.removeBot(bot.botId);
    showAlert(`机器人 ${bot.name} 已删除`);
  }
}

function goToBotDetail(botId: string) {
  router.push(`/bots/${botId}`);
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

// Start health checks on mount
onMounted(() => {
  showAddDialog.value = false;
  showEditDialog.value = false;
  botRegistryStore.startHealthChecks();
});
</script>

<template>
  <div class="p-4 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">机器人注册表</h1>
        <p class="text-sm text-neutral-500">
          共 {{ botRegistryStore.botCount }} 个机器人 · {{ botRegistryStore.onlineCount }} 在线 ·
          {{ botRegistryStore.runningCount }} 运行中
        </p>
      </div>
      <UButton color="primary" icon="mdi-plus" label="添加机器人" @click="openAddDialog" />
    </div>

    <!-- Filters -->
    <div class="flex gap-4 mb-6 items-center">
      <UInput v-model="searchQuery" placeholder="搜索机器人..." icon="mdi-magnify" class="w-64" />
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        label-key="label"
        value-key="value"
        class="w-40"
      />
      <UButton
        variant="soft"
        color="neutral"
        label="刷新健康检查"
        icon="mdi-refresh"
        @click="botRegistryStore.healthCheckAll()"
      />
    </div>

    <!-- Bot List -->
    <div v-if="filteredBots.length > 0" class="grid gap-4">
      <UCard
        v-for="bot in filteredBots"
        :key="bot.botId"
        class="hover:border-primary transition-colors cursor-pointer"
        @click="goToBotDetail(bot.botId)"
      >
        <div class="flex items-center justify-between">
          <!-- Left: info -->
          <div class="flex items-center gap-4">
            <div class="flex flex-col">
              <span class="font-semibold text-lg">{{ bot.name }}</span>
              <span class="text-sm text-neutral-500">{{ bot.botId }}</span>
            </div>
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

          <!-- Right: actions -->
          <div class="flex items-center gap-2" @click.stop>
            <UButton
              variant="soft"
              color="neutral"
              size="sm"
              icon="mdi-pencil"
              title="编辑"
              @click="openEditDialog(bot)"
            />
            <UButton
              variant="soft"
              color="error"
              size="sm"
              icon="mdi-delete"
              title="删除"
              @click="handleDeleteBot(bot)"
            />
          </div>
        </div>

        <!-- Bot details row -->
        <div class="mt-3 flex gap-6 text-sm text-neutral-500">
          <span>API: {{ bot.apiUrl }}</span>
          <span v-if="bot.accountId">账户: {{ bot.accountId }}</span>
          <span v-if="bot.strategyId">策略: {{ bot.strategyId }}</span>
          <span v-if="bot.lastHealthCheck">
            最后检查: {{ new Date(bot.lastHealthCheck).toLocaleTimeString() }}
          </span>
        </div>

        <!-- Tags -->
        <div v-if="bot.tags.length > 0" class="mt-2 flex gap-1">
          <UBadge v-for="tag in bot.tags" :key="tag.id" size="sm" variant="soft">
            {{ tag.name }}
          </UBadge>
        </div>
      </UCard>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-12 text-neutral-500">
      <i-mdi-robot-outline class="text-6xl mb-4" />
      <p class="text-lg">暂无机器人</p>
      <p class="text-sm">点击上方 "添加机器人" 开始注册您的第一个交易机器人</p>
    </div>

    <!-- Add/Edit Dialog -->
    <UModal
      v-if="showAddDialog"
      :open="showAddDialog"
      @update:open="showAddDialog = $event"
      title="添加机器人"
      size="lg"
    >
      <div class="p-4">
        <form ref="addFormRef" novalidate @submit.prevent="handleAddBot">
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="机器人名称" required>
              <UInput v-model="form.name" placeholder="我的交易机器人" required />
            </UFormField>
            <UFormField label="Bot ID" required>
              <UInput v-model="form.botId" placeholder="bot_1" required />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <UFormField label="交易所" required>
              <UInput v-model="form.exchange" placeholder="binance" required />
            </UFormField>
            <UFormField label="运行模式">
              <USelect
                v-model="form.mode"
                :items="modeOptions"
                label-key="label"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <UFormField label="API URL" required>
              <UInput v-model="form.apiUrl" placeholder="http://localhost:8080" required />
            </UFormField>
            <UFormField label="FreqUI URL">
              <UInput v-model="form.freqUiUrl" placeholder="http://localhost:8080 (默认同API)" />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <UFormField label="账户ID">
              <UInput v-model="form.accountId" placeholder="可选" />
            </UFormField>
            <UFormField label="策略ID">
              <UInput v-model="form.strategyId" placeholder="可选" />
            </UFormField>
          </div>
          <UFormField label="备注">
            <UTextarea v-model="form.notes" placeholder="可选备注..." :rows="2" />
          </UFormField>
        </form>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" label="取消" @click="closeDialog" />
          <UButton color="primary" label="添加" @click="handleAddBot" />
        </div>
      </template>
    </UModal>

    <UModal
      v-if="showEditDialog"
      :open="showEditDialog"
      @update:open="showEditDialog = $event"
      title="编辑机器人"
      size="lg"
    >
      <div class="p-4">
        <form ref="editFormRef" novalidate @submit.prevent="handleUpdateBot">
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="机器人名称" required>
              <UInput v-model="form.name" required />
            </UFormField>
            <UFormField label="Bot ID">
              <UInput v-model="form.botId" disabled />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <UFormField label="交易所" required>
              <UInput v-model="form.exchange" required />
            </UFormField>
            <UFormField label="运行模式">
              <USelect
                v-model="form.mode"
                :items="modeOptions"
                label-key="label"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <UFormField label="API URL" required>
              <UInput v-model="form.apiUrl" required />
            </UFormField>
            <UFormField label="FreqUI URL">
              <UInput v-model="form.freqUiUrl" />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <UFormField label="账户ID">
              <UInput v-model="form.accountId" />
            </UFormField>
            <UFormField label="策略ID">
              <UInput v-model="form.strategyId" />
            </UFormField>
          </div>
          <UFormField label="备注">
            <UTextarea v-model="form.notes" :rows="2" />
          </UFormField>
        </form>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" label="取消" @click="closeDialog" />
          <UButton color="primary" label="保存" @click="handleUpdateBot" />
        </div>
      </template>
    </UModal>
  </div>
</template>
