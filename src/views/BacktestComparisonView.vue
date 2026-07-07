<script setup lang="ts">
/**
 * Backtest Comparison View
 * Phase 4: Compare multiple backtest results
 */
import type { BacktestResult } from '@/types/backtestJob';
import { useBacktestJobStore } from '@/stores/backtestJobStore';
import * as echarts from 'echarts';

const backtestJobStore = useBacktestJobStore();
const router = useRouter();

const selectedResults = computed(() => backtestJobStore.selectedResults);

type MetricRow = {
  label: string;
  key: keyof BacktestResult['metrics'] | 'bestPair' | 'worstPair';
  format: 'number' | 'percent' | 'currency' | 'text';
};

const metricRows: MetricRow[] = [
  { label: 'Total Profit', key: 'totalProfit', format: 'currency' },
  { label: 'Profit %', key: 'totalProfitPct', format: 'percent' },
  { label: 'Annual Return', key: 'annualReturn', format: 'percent' },
  { label: 'Max Drawdown', key: 'maxDrawdown', format: 'currency' },
  { label: 'Max Drawdown %', key: 'maxDrawdownPct', format: 'percent' },
  { label: 'Win Rate', key: 'winRate', format: 'percent' },
  { label: 'Profit Factor', key: 'profitFactor', format: 'number' },
  { label: 'Trade Count', key: 'tradeCount', format: 'number' },
  { label: 'Avg Holding Time (min)', key: 'avgHoldingTime', format: 'number' },
  { label: 'Best Pair', key: 'bestPair', format: 'text' },
  { label: 'Worst Pair', key: 'worstPair', format: 'text' },
  { label: 'Capital Utilization', key: 'capitalUtilization', format: 'percent' },
];

function formatMetric(result: BacktestResult, row: MetricRow): string {
  const value = result.metrics[row.key as keyof BacktestResult['metrics']];
  if (row.key === 'bestPair')
    return `${result.metrics.bestPair.pair} (${result.metrics.bestPair.profit.toFixed(2)})`;
  if (row.key === 'worstPair')
    return `${result.metrics.worstPair.pair} (${result.metrics.worstPair.profit.toFixed(2)})`;

  switch (row.format) {
    case 'currency':
      return `$${Number(value).toFixed(2)}`;
    case 'percent':
      return `${(Number(value) * 100).toFixed(2)}%`;
    case 'number':
      return Number(value).toFixed(2);
    default:
      return String(value);
  }
}

function getNumericValue(result: BacktestResult, row: MetricRow): number {
  if (row.key === 'bestPair' || row.key === 'worstPair') return 0;
  return Number(result.metrics[row.key as keyof BacktestResult['metrics']]);
}

function getBestWorst(row: MetricRow, excludeIdx: number): { best: number; worst: number } {
  const values = selectedResults.value
    .filter((_, i) => i !== excludeIdx)
    .map((r) => getNumericValue(r, row))
    .filter((v) => v !== 0);

  if (values.length === 0) return { best: 0, worst: 0 };
  return {
    best: Math.max(...values),
    worst: Math.min(...values),
  };
}

function getCellClass(result: BacktestResult, row: MetricRow, colIdx: number): string {
  if (row.format === 'text' || row.key === 'tradeCount') return '';

  const val = getNumericValue(result, row);
  const { best, worst } = getBestWorst(row, colIdx);

  // Higher is better for most metrics, lower is better for drawdown
  const isDrawdown = row.key.includes('Drawdown');

  if (val === best && best !== worst) {
    return isDrawdown ? 'text-error' : 'text-success';
  }
  if (val === worst && best !== worst) {
    return isDrawdown ? 'text-success' : 'text-error';
  }
  return '';
}

function handleRemoveResult(resultId: string) {
  backtestJobStore.toggleSelectJob(resultId);
  if (backtestJobStore.selectedJobIds.length < 2) {
    router.push('/backtest-jobs');
  }
}

function handleBackToJobs() {
  backtestJobStore.clearSelection();
  router.push('/backtest-jobs');
}

// ==================== Equity Curve Chart ====================

const chartContainer = ref<HTMLElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

function initChart() {
  if (!chartContainer.value || selectedResults.value.length === 0) return;

  if (chartInstance) {
    chartInstance.dispose();
  }

  chartInstance = echarts.init(chartContainer.value);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Normalize equity curves to profit percentage from starting point
  const series = selectedResults.value.map((result, seriesIndex) => {
    const data = result.equityCurve.map((point, _i) => {
      const startEquity = result.equityCurve[0]?.equity || 1;
      const profitPct = ((point.equity - startEquity) / startEquity) * 100;
      return [point.date, profitPct];
    });

    return {
      name: `${result.strategyName} (${result.timeframe})`,
      type: 'line',
      data,
      smooth: true,
      lineStyle: { color: colors[seriesIndex % colors.length], width: 2 },
      itemStyle: { color: colors[seriesIndex % colors.length] },
      showSymbol: false,
    };
  });

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = params[0].name + '<br/>';
        params.forEach((p: any) => {
          result += `${p.seriesName}: ${p.value[1].toFixed(2)}%<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: series.map((s) => s.name),
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: selectedResults.value[0]?.equityCurve.map((p) => p.date) || [],
    },
    yAxis: {
      type: 'value',
      name: 'Profit %',
      axisLabel: {
        formatter: '{value}%',
      },
    },
    series,
  };

  chartInstance.setOption(option);
}

onMounted(() => {
  if (selectedResults.value.length > 0) {
    initChart();
  }
});

watch(
  selectedResults,
  () => {
    nextTick(() => {
      initChart();
    });
  },
  { deep: true },
);

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose();
  }
});
</script>

<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">回测对比</h1>
      <UButton variant="outline" icon="i-mdi-arrow-left" @click="handleBackToJobs">
        返回任务列表
      </UButton>
    </div>

    <div v-if="selectedResults.length === 0" class="text-center py-12 text-neutral-500">
      <p>没有选择任何回测结果</p>
      <UButton class="mt-4" @click="router.push('/backtest-jobs')">返回任务列表</UButton>
    </div>

    <div v-else>
      <!-- Comparison Table -->
      <div class="mb-6 overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-neutral-200 dark:border-neutral-700">
              <th class="text-left py-3 px-4 font-semibold">指标</th>
              <th
                v-for="(result, resultIndex) in selectedResults"
                :key="resultIndex"
                class="text-center py-3 px-4 font-semibold min-w-[150px]"
              >
                <div class="flex flex-col items-center gap-2">
                  <span>{{ result.strategyName }}</span>
                  <span class="text-xs text-neutral-500">{{ result.timeframe }}</span>
                  <UButton
                    size="sm"
                    variant="ghost"
                    color="error"
                    icon="i-mdi-close"
                    @click="handleRemoveResult(result.id)"
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in metricRows"
              :key="row.key"
              class="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            >
              <td class="py-3 px-4 font-medium">{{ row.label }}</td>
              <td
                v-for="(result, resultIndex) in selectedResults"
                :key="resultIndex"
                class="text-center py-3 px-4"
                :class="getCellClass(result, row, resultIndex)"
              >
                {{ formatMetric(result, row) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Equity Curve Chart -->
      <div v-if="selectedResults.some((r) => r.equityCurve.length > 0)" class="mt-8">
        <h2 class="text-lg font-semibold mb-4">权益曲线对比</h2>
        <div ref="chartContainer" class="w-full h-[400px]"></div>
      </div>
    </div>
  </div>
</template>
