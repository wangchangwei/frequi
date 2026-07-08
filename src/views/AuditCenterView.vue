<script setup lang="ts">
/**
 * Audit Center View
 * Phase 6: Trade auditing, P&L reporting, and bot log analysis
 */
import type { TableColumn } from '@nuxt/ui';
// @ts-expect-error UBadge, USelect, UCheckbox are globally registered via @nuxt/ui auto-import
import { UBadge, USelect, UCheckbox } from '@nuxt/ui';
import type { EChartsOption } from 'echarts';
import ECharts from 'vue-echarts';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { use } from 'echarts/core';

import type { AuditEntry, DailyPnL, TradeAuditRecord, TradeFilters } from '@/types/audit';
import { useAuditStore } from '@/stores/auditStore';

use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const auditStore = useAuditStore();

// ==================== Tab State ====================
const activeTab = ref('trades');

// ==================== Trade Filters ====================
const tradeFilters = ref<TradeFilters>({
  dateFrom: '',
  dateTo: '',
  pair: '',
  status: 'all',
  profitMin: undefined,
  profitMax: undefined,
  strategy: '',
});

const statusOptions = [
  { value: 'all', label: '全部 (All)' },
  { value: 'open', label: '进行中 (Open)' },
  { value: 'closed', label: '已平仓 (Closed)' },
];

// ==================== Trade Detail Modal ====================
const showTradeDetail = ref(false);
const selectedTrade = ref<TradeAuditRecord | null>(null);

function openTradeDetail(trade: TradeAuditRecord) {
  selectedTrade.value = trade;
  showTradeDetail.value = true;
}

function closeTradeDetail() {
  showTradeDetail.value = false;
  selectedTrade.value = null;
}

// ==================== Log Filters ====================
const logLevelFilter = ref<string[]>(['info', 'warning', 'error']);
const logCategoryFilter = ref<string[]>([]);

const levelOptions = [
  { value: 'info', label: '信息 (Info)' },
  { value: 'warning', label: '警告 (Warning)' },
  { value: 'error', label: '错误 (Error)' },
];

const categoryOptions = [
  { value: 'trade', label: '交易 (Trade)' },
  { value: 'config', label: '配置 (Config)' },
  { value: 'system', label: '系统 (System)' },
  { value: 'risk', label: '风险 (Risk)' },
  { value: 'bot', label: '机器人 (Bot)' },
];

const filteredLogs = computed(() => {
  return auditStore.auditLogs.filter((log) => {
    if (logLevelFilter.value.length > 0 && !logLevelFilter.value.includes(log.level)) {
      return false;
    }
    if (logCategoryFilter.value.length > 0 && !logCategoryFilter.value.includes(log.category)) {
      return false;
    }
    return true;
  });
});

// ==================== Trade Table Columns ====================
const tradeColumns: TableColumn<TradeAuditRecord>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => `#${row.original.id}`,
  },
  {
    accessorKey: 'entryDate',
    header: '日期 (Date)',
    cell: ({ row }) => new Date(row.original.entryDate).toLocaleDateString(),
  },
  {
    accessorKey: 'pair',
    header: '交易对 (Pair)',
  },
  {
    accessorKey: 'side',
    header: '方向 (Side)',
    cell: ({ row }) => {
      const color = row.original.side === 'long' ? 'success' : 'error';
      const label = row.original.side === 'long' ? '多 (Long)' : '空 (Short)';
      return h(UBadge, { color }, () => label);
    },
  },
  {
    accessorKey: 'entryPrice',
    header: '开仓价 (Entry)',
    cell: ({ row }) => row.original.entryPrice?.toFixed(6) ?? '-',
  },
  {
    accessorKey: 'exitPrice',
    header: '平仓价 (Exit)',
    cell: ({ row }) => row.original.exitPrice?.toFixed(6) ?? '-',
  },
  {
    accessorKey: 'stakeAmount',
    header: '保证金 (Stake)',
    cell: ({ row }) => row.original.stakeAmount?.toFixed(2) ?? '-',
  },
  {
    accessorKey: 'profitPct',
    header: '收益率 % (Profit%)',
    cell: ({ row }) => {
      const pct = row.original.profitPct;
      const color = pct > 0 ? 'success' : pct < 0 ? 'error' : 'neutral';
      return h(UBadge, { color }, () => `${pct?.toFixed(2) ?? '0.00'}%`);
    },
  },
  {
    accessorKey: 'status',
    header: '状态 (Status)',
    cell: ({ row }) => {
      const colorMap: Record<string, 'success' | 'warning' | 'neutral'> = {
        closed: 'success',
        open: 'warning',
        cancelled: 'neutral',
      };
      const labelMap: Record<string, string> = {
        closed: '已平仓',
        open: '进行中',
        cancelled: '已取消',
      };
      return h(
        UBadge,
        { color: colorMap[row.original.status] ?? 'neutral' },
        () => labelMap[row.original.status] ?? row.original.status,
      );
    },
  },
  {
    accessorKey: 'exitReason',
    header: '平仓原因 (Exit Reason)',
  },
];

// ==================== Daily P&L Table Columns ====================
const dailyPnLColumns: TableColumn<DailyPnL>[] = [
  {
    accessorKey: 'date',
    header: '日期 (Date)',
  },
  {
    accessorKey: 'profitAbs',
    header: '收益 (Profit)',
    cell: ({ row }) => {
      const v = row.original.profitAbs;
      const color = v > 0 ? 'success' : v < 0 ? 'error' : 'neutral';
      return h(UBadge, { color }, () => v?.toFixed(2) ?? '0.00');
    },
  },
  {
    accessorKey: 'profitPct',
    header: '收益率 % (P&L%)',
    cell: ({ row }) => `${row.original.profitPct?.toFixed(2) ?? '0.00'}%`,
  },
  {
    accessorKey: 'tradeCount',
    header: '交易数 (Trades)',
  },
  {
    accessorKey: 'winCount',
    header: '盈利 (Wins)',
    cell: ({ row }) => h(UBadge, { color: 'success' }, () => row.original.winCount),
  },
  {
    accessorKey: 'lossCount',
    header: '亏损 (Losses)',
    cell: ({ row }) => h(UBadge, { color: 'error' }, () => row.original.lossCount),
  },
  {
    accessorKey: 'volume',
    header: '成交量 (Volume)',
    cell: ({ row }) => row.original.volume?.toFixed(2) ?? '0.00',
  },
];

// ==================== Chart ====================
const chartOption = computed<EChartsOption>(() => {
  const data = auditStore.dailyPnL;
  return {
    tooltip: {
      trigger: 'axis',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.date),
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: 'Daily P&L',
        type: 'line',
        data: data.map((d) => d.profitAbs),
        areaStyle: {},
        lineStyle: {
          color: '#3b82f6',
        },
        itemStyle: {
          color: '#3b82f6',
        },
      },
    ],
  };
});

// ==================== Actions ====================
async function handleFetchTrades() {
  await auditStore.fetchTrades(tradeFilters.value);
}

async function handleFetchLogs() {
  await auditStore.fetchLogs();
}

async function handleFetchPnL() {
  await auditStore.fetchPnL();
  await auditStore.fetchTrades();
}

function handleExportTrades() {
  auditStore.exportTradesCSV();
}

function handleExportLogs() {
  auditStore.exportAuditLogCSV();
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

function getLevelColor(level: AuditEntry['level']): 'neutral' | 'warning' | 'error' {
  const map: Record<AuditEntry['level'], 'neutral' | 'warning' | 'error'> = {
    info: 'neutral',
    warning: 'warning',
    error: 'error',
  };
  return map[level];
}

function getLevelLabel(level: AuditEntry['level']): string {
  const map: Record<AuditEntry['level'], string> = {
    info: '信息',
    warning: '警告',
    error: '错误',
  };
  return map[level];
}

function getCategoryLabel(cat: AuditEntry['category']): string {
  const map: Record<AuditEntry['category'], string> = {
    trade: '交易',
    config: '配置',
    system: '系统',
    risk: '风险',
    bot: '机器人',
  };
  return map[cat];
}

// ==================== Lifecycle ====================
onMounted(async () => {
  await Promise.allSettled([handleFetchTrades(), handleFetchLogs(), handleFetchPnL()]);
});
</script>

<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">审计中心</h1>
    </div>

    <!-- Tabs -->
    <div class="mb-4">
      <UTabs
        v-model="activeTab"
        :items="[
          { value: 'trades', label: '交易审计 (Trade Audit)' },
          { value: 'pnl', label: '每日收益 (Daily P&L)' },
          { value: 'logs', label: '审计日志 (Audit Log)' },
        ]"
      />
    </div>

    <!-- ==================== Trade Audit Tab ==================== -->
    <div v-if="activeTab === 'trades'" class="space-y-4">
      <!-- Filters -->
      <DraggableContainer header="过滤器 (Filters)">
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <UFormField label="开始日期 (From)">
            <UInput v-model="tradeFilters.dateFrom" type="date" />
          </UFormField>
          <UFormField label="结束日期 (To)">
            <UInput v-model="tradeFilters.dateTo" type="date" />
          </UFormField>
          <UFormField label="交易对 (Pair)">
            <UInput v-model="tradeFilters.pair" placeholder="e.g. BTC/USDT" />
          </UFormField>
          <UFormField label="状态 (Status)">
            <USelect v-model="tradeFilters.status" :items="statusOptions" />
          </UFormField>
          <UFormField label="策略 (Strategy)">
            <UInput v-model="tradeFilters.strategy" placeholder="Strategy name" />
          </UFormField>
          <UFormField label=" " class="pt-6">
            <UButton
              @click="handleFetchTrades"
              icon="i-mdi-magnify"
              :loading="auditStore.isLoading"
            >
              应用 (Apply)
            </UButton>
          </UFormField>
        </div>
      </DraggableContainer>

      <!-- Trades Table -->
      <DraggableContainer header="交易列表 (Trade List)">
        <div class="flex justify-end mb-2">
          <UButton icon="i-mdi-download" variant="outline" size="sm" @click="handleExportTrades">
            导出 CSV (Export CSV)
          </UButton>
        </div>
        <UTable
          :data="auditStore.filteredTrades"
          :columns="tradeColumns"
          :loading="auditStore.isLoading"
          class="text-xs"
        >
          <template #empty-state>
            <div class="text-center py-8 text-neutral-500">
              <i-mdi-clipboard-check-outline class="text-5xl mb-3" />
              <p>暂无交易记录</p>
              <p class="text-sm">No trades found</p>
            </div>
          </template>
          <template #body-row-actions="{ row }">
            <UButton
              size="sm"
              variant="ghost"
              icon="i-mdi-eye"
              @click="openTradeDetail(row.original)"
            >
              查看 (View)
            </UButton>
          </template>
        </UTable>
      </DraggableContainer>
    </div>

    <!-- ==================== Daily P&L Tab ==================== -->
    <div v-if="activeTab === 'pnl'" class="space-y-4">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="border border-primary/30 rounded-lg p-4 bg-primary-900/10">
          <div class="text-xs text-neutral-500 mb-1">总收益 (Total P&L)</div>
          <div
            class="text-xl font-bold"
            :class="
              (auditStore.pnlSummary?.totalProfit ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
            "
          >
            {{ (auditStore.pnlSummary?.totalProfit ?? 0).toFixed(2) }}
          </div>
        </div>
        <div class="border border-primary/30 rounded-lg p-4 bg-primary-900/10">
          <div class="text-xs text-neutral-500 mb-1">胜率 (Win Rate)</div>
          <div class="text-xl font-bold text-blue-500">
            {{ (auditStore.pnlSummary?.winRate ?? 0).toFixed(1) }}%
          </div>
        </div>
        <div class="border border-primary/30 rounded-lg p-4 bg-primary-900/10">
          <div class="text-xs text-neutral-500 mb-1">盈利因子 (Profit Factor)</div>
          <div class="text-xl font-bold text-blue-500">
            {{ (auditStore.pnlSummary?.profitFactor ?? 0).toFixed(2) }}
          </div>
        </div>
        <div class="border border-primary/30 rounded-lg p-4 bg-primary-900/10">
          <div class="text-xs text-neutral-500 mb-1">最大回撤 (Max Drawdown)</div>
          <div class="text-xl font-bold text-red-500">
            {{ (auditStore.pnlSummary?.maxDrawdown ?? 0).toFixed(2) }}
          </div>
        </div>
      </div>

      <!-- P&L Chart -->
      <DraggableContainer header="收益曲线 (Equity Curve)">
        <div class="h-64">
          <ECharts
            v-if="auditStore.dailyPnL.length > 0"
            :option="chartOption"
            class="w-full h-full"
            autoresize
          />
          <div v-else class="flex items-center justify-center h-full text-neutral-500">
            <div class="text-center">
              <i-mdi-chart-line-variant class="text-5xl mb-2" />
              <p>暂无数据 (No data)</p>
            </div>
          </div>
        </div>
      </DraggableContainer>

      <!-- Daily P&L Table -->
      <DraggableContainer header="每日明细 (Daily Breakdown)">
        <UTable
          :data="auditStore.dailyPnL"
          :columns="dailyPnLColumns"
          :loading="auditStore.isLoading"
          class="text-xs"
        >
          <template #empty-state>
            <div class="text-center py-8 text-neutral-500">
              <i-mdi-table class="text-5xl mb-3" />
              <p>暂无每日收益数据</p>
            </div>
          </template>
        </UTable>
      </DraggableContainer>
    </div>

    <!-- ==================== Audit Log Tab ==================== -->
    <div v-if="activeTab === 'logs'" class="space-y-4">
      <!-- Log Filters -->
      <DraggableContainer header="日志过滤器 (Log Filters)">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="级别 (Level)">
            <div class="flex gap-2 flex-wrap">
              <UCheckbox
                v-for="opt in levelOptions"
                :key="opt.value"
                v-model="logLevelFilter"
                :value="opt.value"
                :label="opt.label"
              />
            </div>
          </UFormField>
          <UFormField label="类别 (Category)">
            <div class="flex gap-2 flex-wrap">
              <UCheckbox
                v-for="opt in categoryOptions"
                :key="opt.value"
                v-model="logCategoryFilter"
                :value="opt.value"
                :label="opt.label"
              />
            </div>
          </UFormField>
        </div>
        <div class="flex justify-end mt-4">
          <UButton icon="i-mdi-download" variant="outline" size="sm" @click="handleExportLogs">
            导出 CSV (Export CSV)
          </UButton>
        </div>
      </DraggableContainer>

      <!-- Log List -->
      <DraggableContainer header="日志列表 (Log List)">
        <div v-if="filteredLogs.length === 0" class="text-center py-8 text-neutral-500">
          <i-mdi-format-list-bulleted class="text-5xl mb-3" />
          <p>暂无日志记录</p>
        </div>
        <div v-else class="space-y-2 max-h-96 overflow-y-auto">
          <div
            v-for="log in filteredLogs"
            :key="log.id"
            class="flex items-start gap-3 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3"
          >
            <div class="shrink-0">
              <UBadge :color="getLevelColor(log.level)" size="sm">
                {{ getLevelLabel(log.level) }}
              </UBadge>
            </div>
            <div class="shrink-0 text-xs text-neutral-500 min-w-[140px]">
              {{ formatTimestamp(log.timestamp) }}
            </div>
            <div class="shrink-0">
              <UBadge color="neutral" size="sm">
                {{ getCategoryLabel(log.category) }}
              </UBadge>
            </div>
            <div class="flex-1 text-sm break-all">
              {{ log.message }}
            </div>
          </div>
        </div>
      </DraggableContainer>
    </div>

    <!-- ==================== Trade Detail Modal ==================== -->
    <AppModal
      v-if="showTradeDetail && selectedTrade"
      v-model:open="showTradeDetail"
      :title="`交易详情 #${selectedTrade.id}`"
      size="xl"
    >
      <div class="space-y-4 p-4">
        <!-- Trade Info Card -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div class="text-xs text-neutral-500">交易对 (Pair)</div>
            <div class="font-medium">{{ selectedTrade.pair }}</div>
          </div>
          <div>
            <div class="text-xs text-neutral-500">方向 (Side)</div>
            <UBadge :color="selectedTrade.side === 'long' ? 'success' : 'error'">
              {{ selectedTrade.side === 'long' ? '多 (Long)' : '空 (Short)' }}
            </UBadge>
          </div>
          <div>
            <div class="text-xs text-neutral-500">状态 (Status)</div>
            <UBadge
              :color="
                selectedTrade.status === 'closed'
                  ? 'success'
                  : selectedTrade.status === 'open'
                    ? 'warning'
                    : 'neutral'
              "
            >
              {{ selectedTrade.status }}
            </UBadge>
          </div>
          <div>
            <div class="text-xs text-neutral-500">收益率 (Profit%)</div>
            <div
              class="font-bold"
              :class="selectedTrade.profitPct >= 0 ? 'text-green-500' : 'text-red-500'"
            >
              {{ selectedTrade.profitPct.toFixed(2) }}%
            </div>
          </div>
          <div>
            <div class="text-xs text-neutral-500">开仓价 (Entry Price)</div>
            <div>{{ selectedTrade.entryPrice?.toFixed(6) }}</div>
          </div>
          <div>
            <div class="text-xs text-neutral-500">平仓价 (Exit Price)</div>
            <div>{{ selectedTrade.exitPrice?.toFixed(6) ?? '-' }}</div>
          </div>
          <div>
            <div class="text-xs text-neutral-500">保证金 (Stake)</div>
            <div>{{ selectedTrade.stakeAmount?.toFixed(2) }}</div>
          </div>
          <div>
            <div class="text-xs text-neutral-500">策略 (Strategy)</div>
            <div>{{ selectedTrade.strategy }}</div>
          </div>
        </div>

        <!-- Timeline -->
        <div>
          <h3 class="font-semibold mb-2">时间线 (Timeline)</h3>
          <div class="text-sm text-neutral-500">
            <div>开仓: {{ formatTimestamp(selectedTrade.entryDate) }}</div>
            <div v-if="selectedTrade.exitDate">
              平仓: {{ formatTimestamp(selectedTrade.exitDate) }}
            </div>
            <div v-if="selectedTrade.exitReason">平仓原因: {{ selectedTrade.exitReason }}</div>
          </div>
        </div>

        <!-- Orders Table -->
        <div v-if="selectedTrade.orders && selectedTrade.orders.length > 0">
          <h3 class="font-semibold mb-2">订单列表 (Orders)</h3>
          <UTable :data="selectedTrade.orders" class="text-xs">
            <template #empty-state>
              <div class="text-center py-4 text-neutral-500">暂无订单</div>
            </template>
          </UTable>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UButton variant="outline" @click="closeTradeDetail">关闭 (Close)</UButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
