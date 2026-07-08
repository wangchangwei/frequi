<script setup lang="ts">
/**
 * Backtest Job Queue View
 * Phase 4: Manage backtest job queue and results history
 */
import type { TableColumn } from '@nuxt/ui';
// @ts-expect-error UBadge, UCheckbox are globally registered via @nuxt/ui auto-import
import { UBadge, UCheckbox } from '@nuxt/ui';
import type { BacktestJob, BacktestResult, BacktestJobStatus } from '@/types/backtestJob';
import { useBacktestJobStore } from '@/stores/backtestJobStore';

const backtestJobStore = useBacktestJobStore();
const router = useRouter();

// ==================== Job Queue ====================

const showAddDialog = ref(false);

// Form state
const form = ref({
  name: '',
  strategyName: '',
  pairs: '',
  timeframe: '1h',
  timerange: '',
});

const strategyOptions = [
  { value: 'berlinguyinca', label: 'Berlinguyinca' },
  { value: 'strategy', label: 'Strategy' },
];

const timeframeOptions = [
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' },
];

function setTimerange(preset: string) {
  const now = new Date();
  let start: Date;

  switch (preset) {
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3m':
      start = new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000);
      break;
    case '6m':
      start = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      return;
  }

  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  form.value.timerange = `${fmt(start)}-${fmt(now)}`;
}

function openAddDialog() {
  form.value = {
    name: '',
    strategyName: 'berlinguyinca',
    pairs: '',
    timeframe: '1h',
    timerange: '',
  };
  showAddDialog.value = true;
}

function closeDialog() {
  showAddDialog.value = false;
}

function handleCreateJob() {
  if (!form.value.name.trim() || !form.value.strategyName.trim()) return;

  const pairs = form.value.pairs
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (pairs.length === 0) return;

  backtestJobStore.createJob({
    name: form.value.name.trim(),
    strategyName: form.value.strategyName,
    pairs,
    timeframes: [form.value.timeframe],
    timerange: form.value.timerange || '20240101-20241231',
  });

  showAlert(`回测任务 "${form.value.name}" 已创建`);
  closeDialog();
}

const statusBadgeColor = (status: BacktestJobStatus): 'neutral' | 'info' | 'success' | 'error' => {
  switch (status) {
    case 'queued':
      return 'neutral';
    case 'running':
      return 'info';
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    default:
      return 'neutral';
  }
};

const statusLabel = (status: BacktestJobStatus): string => {
  switch (status) {
    case 'queued':
      return '排队中';
    case 'running':
      return '运行中';
    case 'completed':
      return '已完成';
    case 'failed':
      return '失败';
    default:
      return status;
  }
};

const jobColumns: TableColumn<BacktestJob>[] = [
  {
    accessorKey: 'name',
    header: '任务名称',
  },
  {
    accessorKey: 'strategyName',
    header: '策略',
  },
  {
    accessorKey: 'pairs',
    header: '交易对',
    cell: ({ row }) => row.original.pairs.join(', '),
  },
  {
    accessorKey: 'timerange',
    header: '时间范围',
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) =>
      h(UBadge, { color: statusBadgeColor(row.original.status) }, () =>
        statusLabel(row.original.status),
      ),
  },
  {
    accessorKey: 'startedAt',
    header: '开始时间',
    cell: ({ row }) =>
      row.original.startedAt ? new Date(row.original.startedAt).toLocaleString() : '-',
  },
  {
    accessorKey: 'completedAt',
    header: '完成时间',
    cell: ({ row }) =>
      row.original.completedAt ? new Date(row.original.completedAt).toLocaleString() : '-',
  },
  {
    id: 'select',
    header: '选择',
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: backtestJobStore.selectedJobIds.includes(row.original.resultId ?? ''),
        'onUpdate:modelValue': () => {
          if (row.original.resultId) {
            backtestJobStore.toggleSelectJob(row.original.resultId);
          }
        },
        disabled: !row.original.resultId,
      }),
  },
];

function handleDeleteJob(job: BacktestJob) {
  backtestJobStore.deleteJob(job.id);
  showAlert(`任务 "${job.name}" 已删除`);
}

function handleViewResult(job: BacktestJob) {
  if (job.status === 'completed' && job.resultId) {
    const result = backtestJobStore.results.find((r) => r.id === job.resultId);
    if (result) {
      backtestJobStore.toggleSelectJob(result.id);
      router.push('/backtest-compare');
    }
  }
}

// ==================== Results History ====================

const resultColumns: TableColumn<BacktestResult>[] = [
  {
    accessorKey: 'strategyName',
    header: '策略',
  },
  {
    accessorKey: 'timeframe',
    header: '周期',
  },
  {
    accessorKey: 'metrics.totalProfit',
    header: '总收益',
    cell: ({ row }) =>
      `${row.original.metrics.totalProfit.toFixed(2)} (${row.original.metrics.totalProfitPct.toFixed(2)}%)`,
  },
  {
    accessorKey: 'metrics.maxDrawdown',
    header: '最大回撤',
    cell: ({ row }) =>
      `${row.original.metrics.maxDrawdown.toFixed(2)} (${row.original.metrics.maxDrawdownPct.toFixed(2)}%)`,
  },
  {
    accessorKey: 'metrics.winRate',
    header: '胜率',
    cell: ({ row }) => `${(row.original.metrics.winRate * 100).toFixed(1)}%`,
  },
  {
    accessorKey: 'metrics.tradeCount',
    header: '交易次数',
  },
  {
    accessorKey: 'createdAt',
    header: '创建时间',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
  },
];

function handleDeleteResult(result: BacktestResult) {
  backtestJobStore.deleteResult(result.id);
  showAlert('结果已删除');
}

function handleCompare() {
  if (backtestJobStore.selectedJobIds.length >= 2) {
    router.push('/backtest-compare');
  }
}

const canCompare = computed(() => backtestJobStore.selectedJobIds.length >= 2);
</script>

<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">回测中心</h1>
      <UButton icon="i-mdi-plus" @click="openAddDialog">新建回测任务</UButton>
    </div>

    <!-- Job Queue Panel -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold mb-4">任务队列</h2>
      <UTable :data="backtestJobStore.jobs" :columns="jobColumns" class="mb-4">
        <template #empty-state>
          <div class="text-center py-8 text-neutral-500">
            <i-mdi-play-box-multiple-outline class="text-5xl mb-3" />
            <p>暂无回测任务</p>
            <p class="text-sm">点击"新建回测任务"开始</p>
          </div>
        </template>
        <template #body-row-actions="{ row }">
          <div class="flex gap-2">
            <UButton
              v-if="row.original.status === 'completed'"
              size="sm"
              variant="ghost"
              icon="i-mdi-eye"
              @click="handleViewResult(row.original)"
            />
            <UButton
              size="sm"
              variant="ghost"
              color="error"
              icon="i-mdi-delete"
              @click="handleDeleteJob(row.original)"
            />
          </div>
        </template>
      </UTable>
    </div>

    <!-- Results History Panel -->
    <div>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">结果历史</h2>
        <UButton icon="i-mdi-compare" :disabled="!canCompare" @click="handleCompare">
          开始对比 ({{ backtestJobStore.selectedJobIds.length }})
        </UButton>
      </div>
      <UTable :data="backtestJobStore.results" :columns="resultColumns">
        <template #empty-state>
          <div class="text-center py-8 text-neutral-500">
            <i-mdi-chart-line-variant class="text-5xl mb-3" />
            <p>暂无回测结果</p>
            <p class="text-sm">完成回测任务后将显示结果</p>
          </div>
        </template>
        <template #body-row-actions="{ row }">
          <UButton
            size="sm"
            variant="ghost"
            color="error"
            icon="i-mdi-delete"
            @click="handleDeleteResult(row.original)"
          />
        </template>
      </UTable>
    </div>

    <!-- Add Job Dialog -->
    <AppModal v-if="showAddDialog" @close="showAddDialog = false" title="新建回测任务" size="lg">
      <div class="p-4 space-y-4">
        <UFormField>
          <template #label>任务名称 <span class="text-red-500 font-semibold">*</span></template>
          <UInput v-model="form.name" placeholder="我的回测任务" required />
        </UFormField>

        <UFormField>
          <template #label>策略 <span class="text-red-500 font-semibold">*</span></template>
          <USelect v-model="form.strategyName" :items="strategyOptions" placeholder="选择策略" />
        </UFormField>

        <UFormField label="交易对">
          <UInput v-model="form.pairs" placeholder="BTC/USDT, ETH/USDT, SOL/USDT" />
          <p class="text-xs text-neutral-500 mt-1">多个交易对用逗号分隔</p>
        </UFormField>

        <UFormField label="时间周期">
          <USelect v-model="form.timeframe" :items="timeframeOptions" />
        </UFormField>

        <UFormField label="时间范围">
          <UInput v-model="form.timerange" placeholder="20240101-20240601" />
          <div class="flex gap-2 mt-2">
            <UButton size="sm" variant="outline" @click="setTimerange('30d')">最近30天</UButton>
            <UButton size="sm" variant="outline" @click="setTimerange('3m')">最近3月</UButton>
            <UButton size="sm" variant="outline" @click="setTimerange('6m')">最近6月</UButton>
            <UButton size="sm" variant="outline" @click="setTimerange('1y')">最近1年</UButton>
          </div>
        </UFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" @click="closeDialog">取消</UButton>
          <UButton @click="handleCreateJob">创建</UButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
