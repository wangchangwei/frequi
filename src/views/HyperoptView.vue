<script setup lang="ts">
/**
 * Hyperopt Center View
 * Phase 6: Hyperparameter optimization interface
 */
import type { TableColumn } from '@nuxt/ui';
// @ts-expect-error UBadge, USelect, UCheckbox, UNumberInput are globally registered via @nuxt/ui auto-import
import { UBadge, USelect, UCheckbox, UNumberInput } from '@nuxt/ui';
import type { HyperoptPayload, HyperoptResult } from '@/types/hyperopt';
import { useHyperoptStore } from '@/stores/hyperoptStore';

const hyperoptStore = useHyperoptStore();
const botStore = useBotStore();

// ==================== Config State ====================
const selectedStrategy = ref('');
const selectedSpaces = ref<string[]>(['all']);
const selectedLossFunction = ref('');
const epochs = ref(100);
const timerange = ref('');

const strategyList = computed(() => botStore.activeBot?.strategyList || []);

const strategyOptions = computed(() => strategyList.value.map((s) => ({ value: s, label: s })));

const lossFunctionOptions = computed(() =>
  hyperoptStore.lossFunctions.map((f) => ({
    value: f.name,
    label: `${f.name} — ${f.description}`,
  })),
);

// ==================== Space Checkboxes ====================
const spaceCheckboxes = computed({
  get: () => selectedSpaces.value,
  set: (val) => {
    if (val.includes('all')) {
      selectedSpaces.value = ['all'];
    } else {
      selectedSpaces.value = val;
    }
  },
});

// ==================== Actions ====================
async function handleFetchLossFunctions() {
  await hyperoptStore.fetchLossFunctions();
}

function handleStartHyperopt() {
  if (!selectedStrategy.value) {
    showAlert('Please select a strategy first', 'warning');
    return;
  }
  if (!selectedLossFunction.value) {
    showAlert('Please select a loss function first', 'warning');
    return;
  }

  const payload: HyperoptPayload = {
    strategy: selectedStrategy.value,
    spaces: selectedSpaces.value,
    loss_function: selectedLossFunction.value,
    epochs: epochs.value,
    timerange: timerange.value || undefined,
  };

  hyperoptStore.startHyperopt(payload);
  showAlert('Hyperopt started. Note: execution requires dedicated freqtrade worker.', 'info');
}

function handleStopHyperopt() {
  if (hyperoptStore.activeHyperopt) {
    hyperoptStore.stopHyperopt(hyperoptStore.activeHyperopt.id);
    showAlert('Hyperopt stopped');
  }
}

function handleDeleteResult(id: string) {
  hyperoptStore.deleteHyperoptResult(id);
  showAlert('Hyperopt result deleted');
}

function handleClearResults() {
  hyperoptStore.clearResults();
  showAlert('All hyperopt results cleared');
}

function exportParameters(result: HyperoptResult) {
  if (!result.bestResult || result.bestResult.length === 0) return;

  const headers = ['Parameter', 'Value', 'Optimized'];
  const rows = result.bestResult.map((p) => [
    p.name,
    p.value.toString(),
    p.optimized ? 'Yes' : 'No',
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hyperopt_${result.strategy}_${result.lossFunction}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==================== Results Table Columns ====================
const resultColumns: TableColumn<HyperoptResult>[] = [
  {
    accessorKey: 'strategy',
    header: '策略 (Strategy)',
  },
  {
    accessorKey: 'lossFunction',
    header: 'Loss Function',
  },
  {
    accessorKey: 'bestLoss',
    header: 'Best Loss',
    cell: ({ row }) => {
      const v = row.original.bestLoss;
      return v !== undefined ? v.toFixed(6) : '-';
    },
  },
  {
    accessorKey: 'progress',
    header: '进度 (Progress)',
    cell: ({ row }) => {
      const p = row.original.progress;
      return `${p}%`;
    },
  },
  {
    accessorKey: 'status',
    header: '状态 (Status)',
    cell: ({ row }) => {
      const colorMap: Record<string, 'info' | 'success' | 'error' | 'warning'> = {
        running: 'info',
        completed: 'success',
        failed: 'error',
        stopped: 'warning',
      };
      const labelMap: Record<string, string> = {
        running: '运行中',
        completed: '已完成',
        failed: '失败',
        stopped: '已停止',
      };
      return h(
        UBadge,
        { color: colorMap[row.original.status] ?? 'neutral' },
        () => labelMap[row.original.status] ?? row.original.status,
      );
    },
  },
];

// ==================== Expanded Parameter Columns ====================
const paramColumns: TableColumn<{ name: string; value: number; optimized: boolean }>[] = [
  {
    accessorKey: 'name',
    header: 'Parameter',
  },
  {
    accessorKey: 'value',
    header: 'Value',
  },
  {
    accessorKey: 'optimized',
    header: 'Optimized',
    cell: ({ row }) =>
      row.original.optimized
        ? h(UBadge, { color: 'success' }, () => 'Yes')
        : h(UBadge, { color: 'neutral' }, () => 'No'),
  },
];

// ==================== Lifecycle ====================
onMounted(async () => {
  await handleFetchLossFunctions();
});
</script>

<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold">Hyperopt</h1>
        <UBadge color="info" variant="subtle"> 参数优化 (Parameter Optimization) </UBadge>
      </div>
    </div>

    <!-- Notice -->
    <div class="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
      <div class="flex items-start gap-2">
        <i-mdi-information class="text-blue-400 shrink-0 mt-0.5" />
        <p class="text-sm text-blue-200">
          Hyperopt execution requires a dedicated freqtrade hyperopt worker process running
          separately. This interface allows you to configure and manage hyperopt runs.
        </p>
      </div>
    </div>

    <!-- Configuration Panel -->
    <DraggableContainer header="Hyperopt 配置 (Configuration)" class="mb-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Strategy -->
        <UFormField label="策略 (Strategy)" required>
          <USelect
            v-model="selectedStrategy"
            :items="strategyOptions"
            placeholder="Select strategy"
          />
        </UFormField>

        <!-- Loss Function -->
        <UFormField label="Loss Function" required>
          <USelect
            v-model="selectedLossFunction"
            :items="lossFunctionOptions"
            placeholder="Select loss function"
            :loading="hyperoptStore.isLoading"
          />
        </UFormField>

        <!-- Epochs -->
        <UFormField label="Epochs">
          <UNumberInput v-model="epochs" :min="1" :max="10000" />
        </UFormField>

        <!-- Timerange -->
        <UFormField label="Timerange" class="md:col-span-2">
          <UInput v-model="timerange" placeholder="e.g. 20230101-20231231" />
        </UFormField>
      </div>

      <!-- Spaces -->
      <div class="mt-4">
        <div class="text-sm font-medium mb-2">Spaces (优化空间)</div>
        <div class="flex flex-wrap gap-4">
          <UCheckbox
            v-for="space in hyperoptStore.availableSpaces"
            :key="space.key"
            v-model="spaceCheckboxes"
            :value="space.key"
            :label="space.label"
          />
        </div>
      </div>

      <!-- Start Button -->
      <div class="mt-4 flex gap-2">
        <UButton
          icon="i-mdi-play"
          color="primary"
          :loading="hyperoptStore.isRunning"
          :disabled="hyperoptStore.isRunning || !selectedStrategy || !selectedLossFunction"
          @click="handleStartHyperopt"
        >
          开始优化 (Start Hyperopt)
        </UButton>
      </div>
    </DraggableContainer>

    <!-- Active Hyperopt -->
    <DraggableContainer
      v-if="hyperoptStore.activeHyperopt"
      header="运行中 (Active Hyperopt)"
      class="mb-4"
    >
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-medium">{{ hyperoptStore.activeHyperopt.strategy }}</span>
            <span class="text-neutral-500 ml-2">
              {{ hyperoptStore.activeHyperopt.lossFunction }}
            </span>
          </div>
          <UButton icon="i-mdi-stop" color="error" size="sm" @click="handleStopHyperopt">
            停止 (Stop)
          </UButton>
        </div>

        <div>
          <div class="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{{ hyperoptStore.activeHyperopt.progress }}%</span>
          </div>
          <div class="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
            <div
              class="bg-blue-500 h-2 rounded-full transition-all"
              :style="{ width: `${hyperoptStore.activeHyperopt.progress}%` }"
            />
          </div>
        </div>

        <div v-if="hyperoptStore.activeHyperopt.bestLoss !== undefined" class="text-sm">
          <span class="text-neutral-500">Best Loss: </span>
          <span class="font-mono">{{ hyperoptStore.activeHyperopt.bestLoss.toFixed(6) }}</span>
        </div>
      </div>
    </DraggableContainer>

    <!-- Results Table -->
    <DraggableContainer header="优化结果 (Results)" class="mb-4">
      <div class="flex justify-between items-center mb-4">
        <div class="text-sm text-neutral-500">
          {{ hyperoptStore.hyperoptResults.length }} result(s)
        </div>
        <UButton
          v-if="hyperoptStore.hyperoptResults.length > 0"
          icon="i-mdi-delete"
          variant="ghost"
          color="error"
          size="sm"
          @click="handleClearResults"
        >
          Clear All
        </UButton>
      </div>

      <UTable :data="hyperoptStore.hyperoptResults" :columns="resultColumns" class="text-xs">
        <template #empty-state>
          <div class="text-center py-8 text-neutral-500">
            <i-mdi-flash class="text-5xl mb-3" />
            <p>暂无优化结果</p>
            <p class="text-sm">No hyperopt results yet</p>
          </div>
        </template>

        <!-- Expanded Row for Parameters -->
        <template #body-row-expand="{ row }">
          <div v-if="row.original.bestResult && row.original.bestResult.length > 0">
            <div class="p-2">
              <div class="text-sm font-medium mb-2">Best Parameters:</div>
              <UTable :data="row.original.bestResult" :columns="paramColumns" class="text-xs" />
              <div class="mt-2">
                <UButton
                  icon="i-mdi-download"
                  variant="outline"
                  size="sm"
                  @click="exportParameters(row.original)"
                >
                  Export Parameters
                </UButton>
              </div>
            </div>
          </div>
        </template>

        <template #body-row-actions="{ row }">
          <div class="flex gap-2">
            <UButton
              v-if="row.original.status === 'completed'"
              size="sm"
              variant="ghost"
              icon="i-mdi-download"
              @click="exportParameters(row.original)"
            >
              Export
            </UButton>
            <UButton
              size="sm"
              variant="ghost"
              color="error"
              icon="i-mdi-delete"
              @click="handleDeleteResult(row.original.id)"
            />
          </div>
        </template>
      </UTable>
    </DraggableContainer>

    <!-- History -->
    <DraggableContainer header="历史记录 (History)">
      <div
        v-if="hyperoptStore.hyperoptResults.length === 0"
        class="text-center py-8 text-neutral-500"
      >
        <p>暂无历史记录</p>
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="result in hyperoptStore.hyperoptResults"
          :key="result.id"
          class="flex items-center justify-between border border-neutral-200 dark:border-neutral-700 rounded-lg p-3"
        >
          <div class="flex items-center gap-3">
            <UBadge
              :color="
                result.status === 'completed'
                  ? 'success'
                  : result.status === 'running'
                    ? 'info'
                    : result.status === 'failed'
                      ? 'error'
                      : 'warning'
              "
              size="sm"
            >
              {{ result.status }}
            </UBadge>
            <div>
              <div class="font-medium text-sm">{{ result.strategy }}</div>
              <div class="text-xs text-neutral-500">
                {{ result.lossFunction }} · {{ new Date(result.startTime).toLocaleString() }}
              </div>
            </div>
          </div>
          <div class="text-right">
            <div v-if="result.bestLoss !== undefined" class="font-mono text-sm">
              {{ result.bestLoss.toFixed(6) }}
            </div>
            <div class="text-xs text-neutral-500">
              {{ result.runs }}/{{ result.totalRuns }} runs · {{ result.progress }}%
            </div>
          </div>
        </div>
      </div>
    </DraggableContainer>
  </div>
</template>
