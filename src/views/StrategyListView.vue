<script setup lang="ts">
/**
 * Strategy List View
 * Phase 2: Strategy registry with risk tags
 */
import type { StrategyAsset, StrategyRiskLevel } from '@/types/strategyAsset';
import { useStrategyStore } from '@/stores/strategyAsset';

// Explicit import per Phase 2 requirements
const strategyStore = useStrategyStore();
const router = useRouter();

// ==================== Dialog State ====================
const showAddDialog = ref(false);
const showEditDialog = ref(false);
const editingStrategy = ref<StrategyAsset | null>(null);

// ==================== Form State ====================
const form = ref({
  name: '',
  strategyName: '',
  description: '',
  riskLevel: 'medium' as StrategyRiskLevel,
  tags: '',
  notes: '',
  // Initial version fields
  versionId: '',
  fileHash: '',
  filePath: '',
  parameters: '',
  changelog: '',
});

// ==================== Filters ====================
const searchQuery = ref('');
const riskFilter = ref<StrategyRiskLevel | 'all'>('all');
const tagFilter = ref<string>('all');

const filteredStrategies = computed(() => {
  let result = strategyStore.strategies;

  if (riskFilter.value !== 'all') {
    result = result.filter((s) => s.riskLevel === riskFilter.value);
  }

  if (tagFilter.value !== 'all') {
    result = result.filter((s) => s.tags.includes(tagFilter.value));
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.strategyName.toLowerCase().includes(q) ||
        s.strategyId.toLowerCase().includes(q),
    );
  }

  return result;
});

const allTags = computed(() => {
  const set = new Set<string>();
  strategyStore.strategies.forEach((s) => s.tags.forEach((t) => set.add(t)));
  return ['all', ...Array.from(set)];
});

const riskOptions = [
  { value: 'all', label: '全部' },
  { value: 'low', label: '低风险' },
  { value: 'medium', label: '中风险' },
  { value: 'high', label: '高风险' },
  { value: 'extreme', label: '极高风险' },
];

const riskLevelOptions = [
  { value: 'low', label: '低风险' },
  { value: 'medium', label: '中风险' },
  { value: 'high', label: '高风险' },
  { value: 'extreme', label: '极高风险' },
];

// ==================== Dialog Actions ====================

function openAddDialog() {
  resetForm();
  showAddDialog.value = true;
}

function openEditDialog(strategy: StrategyAsset) {
  editingStrategy.value = strategy;
  form.value = {
    name: strategy.name,
    strategyName: strategy.strategyName,
    description: strategy.description ?? '',
    riskLevel: strategy.riskLevel,
    tags: strategy.tags.join(', '),
    notes: strategy.notes ?? '',
    versionId: '',
    fileHash: '',
    filePath: '',
    parameters: '',
    changelog: '',
  };
  showEditDialog.value = true;
}

function closeDialogs() {
  showAddDialog.value = false;
  showEditDialog.value = false;
  editingStrategy.value = null;
}

function resetForm() {
  form.value = {
    name: '',
    strategyName: '',
    description: '',
    riskLevel: 'medium',
    tags: '',
    notes: '',
    versionId: '',
    fileHash: '',
    filePath: '',
    parameters: '',
    changelog: '',
  };
}

function validateForm(isAdd: boolean): boolean {
  if (!form.value.name.trim() || !form.value.strategyName.trim()) return false;
  if (isAdd && !form.value.fileHash.trim()) return false;
  return true;
}

function handleAddStrategy() {
  if (!validateForm(true)) return;

  const tags = form.value.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  strategyStore.addStrategy({
    name: form.value.name.trim(),
    strategyName: form.value.strategyName.trim(),
    description: form.value.description.trim() || undefined,
    tags,
    notes: form.value.notes.trim() || undefined,
    riskLevel: form.value.riskLevel,
    initialVersion: {
      versionId: form.value.versionId.trim() || `v${Date.now()}`,
      strategyName: form.value.strategyName.trim(),
      fileHash: form.value.fileHash.trim(),
      filePath: form.value.filePath.trim() || undefined,
      parameters: form.value.parameters.trim() || undefined,
      changelog: form.value.changelog.trim() || undefined,
      isActive: true,
    },
  });

  showAlert(`策略 ${form.value.name} 已添加`);
  closeDialogs();
}

function handleUpdateStrategy() {
  if (!editingStrategy.value || !validateForm(false)) return;

  const tags = form.value.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  strategyStore.updateStrategy(editingStrategy.value.strategyId, {
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

async function handleDeleteStrategy(strategy: StrategyAsset) {
  const { confirm } = useConfirmBox();
  if (
    await confirm({
      title: '删除确认',
      message: `确定要删除策略 ${strategy.name} (${strategy.strategyId}) 吗？此操作不可恢复。`,
    })
  ) {
    strategyStore.removeStrategy(strategy.strategyId);
    showAlert(`策略 ${strategy.name} 已删除`);
  }
}

// ==================== Navigation ====================

function goToDetail(strategyId: string) {
  router.push(`/strategies/${strategyId}`);
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

function getVersionCount(strategy: StrategyAsset): number {
  return strategy.versions.length;
}

// ==================== Mount ====================
onMounted(() => {
  showAddDialog.value = false;
  showEditDialog.value = false;
});
</script>

<template>
  <div class="p-4 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">策略管理</h1>
        <p class="text-sm text-neutral-500">共 {{ strategyStore.strategyCount }} 个策略</p>
      </div>
      <UButton color="primary" icon="mdi-plus" label="添加策略" @click="openAddDialog" />
    </div>

    <!-- Filters -->
    <div class="flex gap-4 mb-6 items-center">
      <UInput v-model="searchQuery" placeholder="搜索策略..." icon="mdi-magnify" class="w-64" />
      <USelect
        v-model="riskFilter"
        :items="riskOptions"
        label-key="label"
        value-key="value"
        class="w-36"
      />
      <USelect
        v-if="allTags.length > 1"
        v-model="tagFilter"
        :items="allTags.map((t) => ({ value: t, label: t === 'all' ? '全部标签' : t }))"
        label-key="label"
        value-key="value"
        class="w-40"
      />
    </div>

    <!-- Strategy List -->
    <div v-if="filteredStrategies.length > 0" class="grid gap-4">
      <UCard
        v-for="strategy in filteredStrategies"
        :key="strategy.strategyId"
        class="hover:border-primary transition-colors cursor-pointer"
        @click="goToDetail(strategy.strategyId)"
      >
        <div class="flex items-center justify-between">
          <!-- Left: info -->
          <div class="flex items-center gap-4">
            <div class="flex flex-col">
              <span class="font-semibold text-lg">{{ strategy.name }}</span>
              <span class="text-sm text-neutral-500">
                {{ strategy.strategyName }} · {{ strategy.strategyId }}
              </span>
            </div>
            <UBadge :color="getRiskColor(strategy.riskLevel)" variant="soft">
              {{ getRiskLabel(strategy.riskLevel) }}
            </UBadge>
            <UBadge color="neutral" variant="outline">
              {{ getVersionCount(strategy) }} 版本
            </UBadge>
            <UBadge
              v-for="tag in strategy.tags"
              :key="tag"
              color="primary"
              variant="subtle"
              size="sm"
            >
              {{ tag }}
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
              @click="openEditDialog(strategy)"
            />
            <UButton
              variant="soft"
              color="error"
              size="sm"
              icon="mdi-delete"
              title="删除"
              @click="handleDeleteStrategy(strategy)"
            />
          </div>
        </div>

        <!-- Strategy details row -->
        <div class="mt-3 flex gap-6 text-sm text-neutral-500">
          <span v-if="strategy.currentFileHash"
            >Hash: {{ strategy.currentFileHash.slice(0, 12) }}...</span
          >
          <span>关联机器人: {{ strategy.linkedBots.length }}</span>
          <span>关联回测: {{ strategy.linkedBacktests.length }}</span>
          <span>创建: {{ formatDate(strategy.createdAt) }}</span>
          <span v-if="strategy.description" class="italic">描述: {{ strategy.description }}</span>
        </div>

        <!-- Linked bots preview -->
        <div v-if="strategy.linkedBots.length > 0" class="mt-2 flex gap-1">
          <span class="text-xs text-neutral-500 mr-1">机器人:</span>
          <UBadge
            v-for="bot in strategy.linkedBots.slice(0, 3)"
            :key="bot.botId"
            size="xs"
            variant="soft"
          >
            {{ bot.botName }}
          </UBadge>
          <span v-if="strategy.linkedBots.length > 3" class="text-xs text-neutral-500">
            +{{ strategy.linkedBots.length - 3 }}
          </span>
        </div>
      </UCard>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-12 text-neutral-500">
      <i-mdi-brain class="text-6xl mb-4" />
      <p class="text-lg">暂无策略</p>
      <p class="text-sm">点击上方 "添加策略" 开始注册您的第一个交易策略</p>
    </div>

    <!-- Add Strategy Dialog -->
    <AppModal v-if="showAddDialog" @close="showAddDialog = false" title="添加策略" size="lg">
      <div class="p-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField>
            <template #label
              >策略显示名称 <span class="text-red-500 font-semibold">*</span></template
            >
            <UInput v-model="form.name" placeholder="趋势跟踪策略" />
          </UFormField>
          <UFormField>
            <template #label
              >Freqtrade 策略类名 <span class="text-red-500 font-semibold">*</span></template
            >
            <UInput v-model="form.strategyName" placeholder="StrategyV1" />
          </UFormField>
        </div>
        <div class="grid grid-cols-2 gap-4 mt-4">
          <UFormField>
            <template #label>风险等级 <span class="text-red-500 font-semibold">*</span></template>
            <USelect
              v-model="form.riskLevel"
              :items="riskLevelOptions"
              label-key="label"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField label="标签 (逗号分隔)">
            <UInput v-model="form.tags" placeholder="趋势, 日内" />
          </UFormField>
        </div>
        <div class="mt-4">
          <UFormField label="描述 (可选)">
            <UTextarea v-model="form.description" :rows="2" placeholder="策略描述..." />
          </UFormField>
        </div>

        <hr class="my-4 border-neutral-200 dark:border-neutral-700" />

        <h3 class="text-base font-semibold text-neutral-900 dark:text-neutral-100 mt-6 mb-3">
          初始版本信息
        </h3>
        <div class="grid grid-cols-2 gap-4">
          <UFormField>
            <template #label>版本号 <span class="text-red-500 font-semibold">*</span></template>
            <UInput v-model="form.versionId" placeholder="v1.0.0" />
          </UFormField>
          <UFormField>
            <template #label
              >文件 Hash (SHA256) <span class="text-red-500 font-semibold">*</span></template
            >
            <UInput v-model="form.fileHash" placeholder="策略文件的 SHA256 哈希值" />
          </UFormField>
        </div>
        <div class="mt-4">
          <UFormField label="文件路径">
            <UInput v-model="form.filePath" placeholder="user_data/strategies/my_strategy.py" />
          </UFormField>
        </div>
        <div class="mt-4">
          <UFormField label="参数 (JSON)">
            <UTextarea v-model="form.parameters" :rows="3" placeholder='{"buy_rsi": 30}' />
          </UFormField>
        </div>
        <div class="mt-4">
          <UFormField label="更新日志">
            <UTextarea v-model="form.changelog" :rows="2" placeholder="初始版本..." />
          </UFormField>
        </div>
        <div class="mt-4">
          <UFormField label="备注 (可选)">
            <UTextarea v-model="form.notes" :rows="2" placeholder="可选备注..." />
          </UFormField>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="取消" @click="closeDialogs" />
          <UButton color="primary" class="min-w-24" label="添加" @click="handleAddStrategy" />
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
              :items="riskLevelOptions"
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
          <UFormField label="描述 (可选)">
            <UTextarea v-model="form.description" :rows="2" />
          </UFormField>
        </div>
        <div class="mt-4">
          <UFormField label="备注 (可选)">
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
  </div>
</template>
