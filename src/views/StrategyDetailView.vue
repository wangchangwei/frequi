<script setup lang="ts">
/**
 * Strategy Detail View
 * Phase 2: Version history, linked bots/backtests
 */
import type {
  AddVersionInput,
  StrategyAsset,
  StrategyBacktestLink,
  StrategyRiskLevel,
  StrategyVersion,
} from '@/types/strategyAsset';
import type { TableColumn } from '@nuxt/ui';
import { useStrategyStore } from '@/stores/strategyAsset';

// Explicit import per Phase 2 requirements
const strategyStore = useStrategyStore();
const route = useRoute();
const router = useRouter();

const strategyId = computed(() => route.params.id as string);

const strategy = computed<StrategyAsset | undefined>(() =>
  strategyStore.getStrategy(strategyId.value),
);

// Redirect if strategy not found
watch(
  strategy,
  (s) => {
    if (!s) {
      router.replace('/strategies');
    }
  },
  { immediate: true },
);

// ==================== Dialog State ====================
const showAddVersionDialog = ref(false);
const showEditDialog = ref(false);
const showUnlinkBotDialog = ref(false);
const showUnlinkBacktestDialog = ref(false);
const selectedBotId = ref('');
const selectedBacktestId = ref('');

// ==================== Form State ====================
const form = ref({
  name: '',
  strategyName: '',
  description: '',
  riskLevel: 'medium' as StrategyRiskLevel,
  tags: '',
  notes: '',
});

const newVersionForm = ref({
  versionId: '',
  fileHash: '',
  filePath: '',
  parameters: '',
  changelog: '',
});

// ==================== Actions ====================

function openEditDialog() {
  if (!strategy.value) return;
  form.value = {
    name: strategy.value.name,
    strategyName: strategy.value.strategyName,
    description: strategy.value.description ?? '',
    riskLevel: strategy.value.riskLevel,
    tags: strategy.value.tags.join(', '),
    notes: strategy.value.notes ?? '',
  };
  showEditDialog.value = true;
}

function openAddVersionDialog() {
  if (!strategy.value) return;
  newVersionForm.value = {
    versionId: `v${strategy.value.versions.length + 1}.0`,
    fileHash: '',
    filePath: '',
    parameters: '',
    changelog: '',
  };
  showAddVersionDialog.value = true;
}

function closeDialogs() {
  showEditDialog.value = false;
  showAddVersionDialog.value = false;
  showUnlinkBotDialog.value = false;
  showUnlinkBacktestDialog.value = false;
  selectedBotId.value = '';
  selectedBacktestId.value = '';
}

function validateEditForm(): boolean {
  return !!(form.value.name.trim() && form.value.strategyName.trim() && form.value.riskLevel);
}

function validateNewVersionForm(): boolean {
  return !!(newVersionForm.value.versionId.trim() && newVersionForm.value.fileHash.trim());
}

function handleUpdateStrategy() {
  if (!strategy.value || !validateEditForm()) return;

  const tags = form.value.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  strategyStore.updateStrategy(strategy.value.strategyId, {
    name: form.value.name.trim(),
    strategyName: form.value.strategyName.trim(),
    description: form.value.description.trim() || undefined,
    tags,
    notes: form.value.notes.trim() || undefined,
    riskLevel: form.value.riskLevel,
  });

  showAlert(`策略 ${form.value.name} 已更新`);
  closeDialogs();
}

function handleAddVersion() {
  if (!strategy.value || !validateNewVersionForm()) return;

  const versionInput: AddVersionInput = {
    versionId: newVersionForm.value.versionId.trim(),
    strategyName: strategy.value.strategyName,
    fileHash: newVersionForm.value.fileHash.trim(),
    filePath: newVersionForm.value.filePath.trim(),
    parameters: newVersionForm.value.parameters.trim() || undefined,
    changelog: newVersionForm.value.changelog.trim() || undefined,
  };

  strategyStore.addVersion(strategy.value.strategyId, versionInput);

  showAlert(`版本 ${versionInput.versionId} 已添加`);
  closeDialogs();
}

function handleSetActiveVersion(versionId: string) {
  if (!strategy.value) return;
  strategyStore.setActiveVersion(strategy.value.strategyId, versionId);
  showAlert(`已设置 ${versionId} 为活跃版本`);
}

function handleUnlinkBot(botId: string) {
  if (!strategy.value) return;
  strategyStore.unlinkBot(strategy.value.strategyId, botId);
  showAlert('机器人已解除关联');
  closeDialogs();
}

function handleUnlinkBacktest(backtestId: string) {
  if (!strategy.value) return;
  strategyStore.unlinkBacktest(strategy.value.strategyId, backtestId);
  showAlert('回测已解除关联');
  closeDialogs();
}

function confirmUnlinkBot(botId: string) {
  selectedBotId.value = botId;
  showUnlinkBotDialog.value = true;
}

function confirmUnlinkBacktest(backtestId: string) {
  selectedBacktestId.value = backtestId;
  showUnlinkBacktestDialog.value = true;
}

// ==================== Helpers ====================

function getRiskColor(risk: StrategyRiskLevel): 'success' | 'warning' | 'error' {
  switch (risk) {
    case 'low':
      return 'success';
    case 'medium':
      return 'warning';
    case 'high':
      return 'error';
    case 'extreme':
      return 'error';
    default:
      return 'warning';
  }
}

function getRiskLabel(risk: StrategyRiskLevel): string {
  switch (risk) {
    case 'low':
      return '低风险';
    case 'medium':
      return '中风险';
    case 'high':
      return '高风险';
    case 'extreme':
      return '极高风险';
    default:
      return '未知';
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

const versionColumns: TableColumn<StrategyVersion>[] = [
  { accessorKey: 'versionId', header: '版本' },
  { accessorKey: 'fileHash', header: 'Hash' },
  { accessorKey: 'isActive', header: '状态' },
  { accessorKey: 'createdAt', header: '创建时间' },
  { id: 'actions', header: '操作' },
];

const backtestColumns: TableColumn<StrategyBacktestLink>[] = [
  { accessorKey: 'backtestId', header: '回测ID' },
  { accessorKey: 'label', header: '名称' },
  { accessorKey: 'profitRatio', header: '收益率' },
  { accessorKey: 'linkedAt', header: '关联时间' },
  { id: 'actions', header: '操作' },
];

function getBotName(botId: string): string {
  const bot = strategy.value?.linkedBots.find((b) => b.botId === botId);
  return bot?.botName ?? botId;
}

function getBacktestLabel(backtestId: string): string {
  const bt = strategy.value?.linkedBacktests.find((b) => b.backtestId === backtestId);
  return bt?.label ?? backtestId;
}

// ==================== Mount ====================
onMounted(() => {
  showEditDialog.value = false;
  showAddVersionDialog.value = false;
});
</script>

<template>
  <div v-if="strategy" class="p-4 max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <div class="flex items-center gap-3">
          <UButton variant="ghost" icon="mdi-arrow-left" @click="router.push('/strategies')" />
          <h1 class="text-2xl font-bold">{{ strategy.name }}</h1>
          <UBadge :color="getRiskColor(strategy.riskLevel)" variant="soft">
            {{ getRiskLabel(strategy.riskLevel) }}
          </UBadge>
        </div>
        <p class="text-sm text-neutral-500 mt-1">
          {{ strategy.strategyName }} · {{ strategy.strategyId }}
        </p>
      </div>
      <UButton color="primary" icon="mdi-pencil" label="编辑策略" @click="openEditDialog" />
    </div>

    <!-- Strategy Info -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <UCard>
        <template #header>
          <span class="font-medium">基本信息</span>
        </template>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-neutral-500">策略类名:</span>
            <span>{{ strategy.strategyName }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-500">当前版本:</span>
            <span>{{ strategy.currentVersionId }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-500">风险等级:</span>
            <span>{{ getRiskLabel(strategy.riskLevel) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-500">创建时间:</span>
            <span>{{ formatDate(strategy.createdAt) }}</span>
          </div>
          <div v-if="strategy.description" class="mt-2">
            <span class="text-neutral-500">描述:</span>
            <p class="mt-1 text-neutral-700 dark:text-neutral-300">{{ strategy.description }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <span class="font-medium">标签</span>
        </template>
        <div class="flex flex-wrap gap-2">
          <UBadge v-for="tag in strategy.tags" :key="tag" color="primary" variant="subtle">
            {{ tag }}
          </UBadge>
          <span v-if="strategy.tags.length === 0" class="text-neutral-500 text-sm">暂无标签</span>
        </div>
      </UCard>
    </div>

    <!-- Version History -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">版本历史 ({{ strategy.versions.length }})</h2>
        <UButton size="sm" icon="mdi-plus" label="添加版本" @click="openAddVersionDialog" />
      </div>

      <UCard>
        <UTable :rows="strategy.versions" :columns="versionColumns">
          <template #versionId="{ row }">
            <span class="font-mono">{{ row.original.versionId }}</span>
          </template>
          <template #fileHash="{ row }">
            <span class="font-mono text-xs">{{ row.original.fileHash.slice(0, 16) }}...</span>
          </template>
          <template #isActive="{ row }">
            <UBadge v-if="row.original.isActive" color="success" variant="soft">活跃</UBadge>
            <UBadge v-else color="neutral" variant="outline">非活跃</UBadge>
          </template>
          <template #createdAt="{ row }">
            {{ formatDate(row.original.createdAt) }}
          </template>
          <template #actions="{ row }">
            <div class="flex gap-1">
              <UButton
                v-if="!row.original.isActive"
                size="xs"
                variant="soft"
                color="primary"
                label="激活"
                @click="handleSetActiveVersion(row.original.versionId)"
              />
              <UButton size="xs" variant="soft" color="neutral" label="详情" @click="() => {}" />
            </div>
          </template>
        </UTable>
      </UCard>
    </div>

    <!-- Linked Bots -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">关联机器人 ({{ strategy.linkedBots.length }})</h2>
      </div>

      <UCard v-if="strategy.linkedBots.length > 0">
        <div class="space-y-2">
          <div
            v-for="bot in strategy.linkedBots"
            :key="bot.botId"
            class="flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded"
          >
            <div>
              <span class="font-medium">{{ bot.botName }}</span>
              <span class="text-xs text-neutral-500 ml-2">{{ bot.botId }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-neutral-500"> 关联于 {{ formatDate(bot.linkedAt) }} </span>
              <UButton
                size="xs"
                variant="soft"
                color="error"
                icon="mdi-unlink"
                @click="confirmUnlinkBot(bot.botId)"
              />
            </div>
          </div>
        </div>
      </UCard>
      <div v-else class="text-center py-8 text-neutral-500">
        <i-mdi-robot-outline class="text-4xl mb-2" />
        <p>暂无关联的机器人</p>
      </div>
    </div>

    <!-- Linked Backtests -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">关联回测 ({{ strategy.linkedBacktests.length }})</h2>
      </div>

      <UCard v-if="strategy.linkedBacktests.length > 0">
        <UTable :rows="strategy.linkedBacktests" :columns="backtestColumns">
          <template #backtestId="{ row }">
            <span class="font-mono text-xs">{{ row.original.backtestId }}</span>
          </template>
          <template #profitRatio="{ row }">
            <span
              v-if="row.original.profitRatio !== undefined"
              :class="row.original.profitRatio >= 0 ? 'text-green-500' : 'text-red-500'"
            >
              {{ (row.original.profitRatio * 100).toFixed(2) }}%
            </span>
            <span v-else class="text-neutral-500">-</span>
          </template>
          <template #linkedAt="{ row }">
            {{ formatDate(row.original.linkedAt) }}
          </template>
          <template #actions="{ row }">
            <UButton
              size="xs"
              variant="soft"
              color="error"
              icon="mdi-unlink"
              @click="confirmUnlinkBacktest(row.original.backtestId)"
            />
          </template>
        </UTable>
      </UCard>
      <div v-else class="text-center py-8 text-neutral-500">
        <i-mdi-chart-line class="text-4xl mb-2" />
        <p>暂无关联的回测</p>
      </div>
    </div>

    <!-- Notes -->
    <div v-if="strategy.notes" class="mb-6">
      <h2 class="text-xl font-semibold mb-4">备注</h2>
      <UCard>
        <p class="text-sm whitespace-pre-wrap">{{ strategy.notes }}</p>
      </UCard>
    </div>

    <!-- Add Version Dialog -->
    <AppModal
      v-if="showAddVersionDialog"
      @close="showAddVersionDialog = false"
      title="添加新版本"
      size="lg"
    >
      <div class="p-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField>
            <template #label>版本号 <span class="text-red-500 font-semibold">*</span></template>
            <UInput v-model="newVersionForm.versionId" placeholder="v2.0.0" />
          </UFormField>
          <UFormField>
            <template #label
              >文件 Hash (SHA256) <span class="text-red-500 font-semibold">*</span></template
            >
            <UInput v-model="newVersionForm.fileHash" placeholder="策略文件的 SHA256 哈希值" />
          </UFormField>
        </div>
        <div class="mt-4">
          <UFormField label="文件路径">
            <UInput
              v-model="newVersionForm.filePath"
              placeholder="user_data/strategies/my_strategy_v2.py"
            />
          </UFormField>
        </div>
        <div class="mt-4">
          <UFormField label="参数 (JSON)">
            <UTextarea
              v-model="newVersionForm.parameters"
              :rows="3"
              placeholder='{"buy_rsi": 30, "sell_rsi": 70}'
            />
          </UFormField>
        </div>
        <div class="mt-4">
          <UFormField label="更新日志">
            <UTextarea v-model="newVersionForm.changelog" :rows="2" placeholder="新增特性..." />
          </UFormField>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="取消" @click="closeDialogs" />
          <UButton color="primary" label="添加版本" @click="handleAddVersion" />
        </div>
      </template>
    </AppModal>

    <!-- Edit Strategy Dialog -->
    <AppModal v-if="showEditDialog" @close="showEditDialog = false" title="编辑策略" size="lg">
      <div class="p-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField>
            <template #label
              >策略显示名称 <span class="text-red-500 font-semibold">*</span></template
            >
            <UInput v-model="form.name" />
          </UFormField>
          <UFormField>
            <template #label
              >Freqtrade 策略类名 <span class="text-red-500 font-semibold">*</span></template
            >
            <UInput v-model="form.strategyName" />
          </UFormField>
        </div>
        <div class="grid grid-cols-2 gap-4 mt-4">
          <UFormField>
            <template #label>风险等级 <span class="text-red-500 font-semibold">*</span></template>
            <USelect
              v-model="form.riskLevel"
              :items="[
                { value: 'low', label: '低风险' },
                { value: 'medium', label: '中风险' },
                { value: 'high', label: '高风险' },
                { value: 'extreme', label: '极高风险' },
              ]"
              label-key="label"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField label="标签 (逗号分隔)">
            <UInput v-model="form.tags" />
          </UFormField>
        </div>
        <div class="mt-4">
          <UFormField label="描述">
            <UTextarea v-model="form.description" :rows="2" />
          </UFormField>
        </div>
        <div class="mt-4">
          <UFormField label="备注">
            <UTextarea v-model="form.notes" :rows="2" />
          </UFormField>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="取消" @click="closeDialogs" />
          <UButton color="primary" class="min-w-24" label="保存" @click="handleUpdateStrategy" />
        </div>
      </template>
    </AppModal>

    <!-- Unlink Bot Dialog -->
    <AppModal
      v-if="showUnlinkBotDialog"
      @close="showUnlinkBotDialog = false"
      title="解除机器人关联"
      size="sm"
    >
      <div class="p-4">
        <p>
          确定要解除机器人 <strong>{{ getBotName(selectedBotId) }}</strong> 的关联吗？
        </p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="取消" @click="closeDialogs" />
          <UButton color="error" label="解除" @click="handleUnlinkBot(selectedBotId)" />
        </div>
      </template>
    </AppModal>

    <!-- Unlink Backtest Dialog -->
    <AppModal
      v-if="showUnlinkBacktestDialog"
      @close="showUnlinkBacktestDialog = false"
      title="解除回测关联"
      size="sm"
    >
      <div class="p-4">
        <p>
          确定要解除回测 <strong>{{ getBacktestLabel(selectedBacktestId) }}</strong> 的关联吗？
        </p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="取消" @click="closeDialogs" />
          <UButton color="error" label="解除" @click="handleUnlinkBacktest(selectedBacktestId)" />
        </div>
      </template>
    </AppModal>
  </div>
</template>
