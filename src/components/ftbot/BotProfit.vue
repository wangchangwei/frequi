<script setup lang="ts">
import type { AllProfitStats } from '@/types';

const props = defineProps<{
  profitAll: AllProfitStats;
  stakeCurrency: string;
  stakeCurrencyDecimals: number;
}>();

const profit = computed(() => {
  if (!props.profitAll?.short) {
    return props.profitAll.all;
  }
  return props.profitAll[selectedOption.value];
});

const profitItems = computed(() => {
  if (!profit.value) return [];
  return [
    {
      metric: '已平仓收益率',
      value: profit.value.profit_closed_coin
        ? `${formatPriceCurrency(
            profit.value.profit_closed_coin,
            props.stakeCurrency,
            props.stakeCurrencyDecimals,
          )} (${formatPercent(profit.value.profit_closed_ratio_mean, 2)})`
        : 'N/A',
      // (&sum; ${formatPercent(profit.value.profit_closed_ratio_sum,  2,)})`
    },
    {
      metric: '所有交易收益率',
      value: profit.value.profit_all_coin
        ? `${formatPriceCurrency(
            profit.value.profit_all_coin,
            props.stakeCurrency,
            props.stakeCurrencyDecimals,
          )} (${formatPercent(profit.value.profit_all_ratio_mean, 2)})`
        : 'N/A',
      //  (&sum; ${formatPercent(profit.value.profit_all_ratio_sum,2,)})`
    },

    {
      metric: '交易总数',
      value: `${profit.value.trade_count ?? 0}`,
    },
    {
      metric: '机器人启动时间',
      value: profit.value.bot_start_timestamp,
      isTs: true,
    },
    {
      metric: '首笔交易开仓',
      value: profit.value.first_trade_timestamp,
      isTs: true,
    },
    {
      metric: '最后一笔交易开仓',
      value: profit.value.latest_trade_timestamp,
      isTs: true,
    },
    {
      metric: '盈 / 亏',
      value: `${profit.value.winning_trades ?? 0} / ${profit.value.losing_trades ?? 0}`,
    },
    {
      metric: '胜率',
      value: `${profit.value.winrate ? formatPercent(profit.value.winrate) : 'N/A'}`,
    },
    {
      metric: '期望值 (比率)',
      value: `${formatNumber(profit.value.expectancy, 2)} (${formatNumber(profit.value.expectancy_ratio, 2)})`,
    },
    {
      metric: 'CAGR',
      value: `${formatPercent(profit.value.cagr, 2)}`,
    },
    {
      metric: 'Calmar',
      value: `${formatNumber(profit.value.calmar, 2)}`,
    },
    {
      metric: 'Sharpe',
      value: `${formatNumber(profit.value.sharpe, 2)}`,
    },
    {
      metric: 'Sortino',
      value: `${formatNumber(profit.value.sortino, 2)}`,
    },
    {
      metric: 'SQN',
      value: `${formatNumber(profit.value.sqn, 2)}`,
    },
    {
      metric: '平均持仓时长',
      value: `${profit.value.avg_duration ?? 'N/A'}`,
    },
    {
      metric: '最佳交易对',
      value: profit.value.best_pair
        ? `${profit.value.best_pair}: ${formatPercent(profit.value.best_pair_profit_ratio, 2)}`
        : 'N/A',
    },
    {
      metric: '交易量',
      value: `${formatPriceCurrency(
        profit.value.trading_volume ?? 0,
        props.stakeCurrency,
        props.stakeCurrencyDecimals,
      )}`,
    },
    {
      metric: '收益因子',
      value: `${formatNumber(profit.value.profit_factor, 2)}`,
    },
    {
      metric: '最大回撤',
      value: `${profit.value.max_drawdown ? formatPercent(profit.value.max_drawdown, 2) : 'N/A'} (${
        profit.value.max_drawdown_abs
          ? formatPriceCurrency(
              profit.value.max_drawdown_abs,
              props.stakeCurrency,
              props.stakeCurrencyDecimals,
            )
          : 'N/A'
      }) ${
        profit.value.max_drawdown_start_timestamp && profit.value.max_drawdown_end_timestamp
          ? '从 ' +
            timestampms(profit.value.max_drawdown_start_timestamp) +
            ' 到 ' +
            timestampms(profit.value.max_drawdown_end_timestamp)
          : ''
      }`,
    },
    {
      metric: '当前回撤',
      value: `${profit.value.current_drawdown ? formatPercent(profit.value.current_drawdown, 2) : 'N/A'} (${
        profit.value.current_drawdown_abs
          ? formatPriceCurrency(
              profit.value.current_drawdown_abs,
              props.stakeCurrency,
              props.stakeCurrencyDecimals,
            )
          : 'N/A'
      }) ${
        profit.value.current_drawdown_start_timestamp
          ? '自 ' + timestampms(profit.value.current_drawdown_start_timestamp)
          : ''
      }`,
    },
  ];
});

const selectedOption = ref('all');
const options = [
  { value: 'all', text: '全部' },
  { value: 'long', text: '多单' },
  { value: 'short', text: '空单' },
];
</script>

<template>
  <div>
    <div v-if="profitAll?.long && profitAll?.short" class="flex justify-between items-center">
      <span>收益</span>
      <USegmentedControl
        v-model="selectedOption"
        :items="options"
        label-key="text"
        value-key="value"
      ></USegmentedControl>
      <span>交易</span>
    </div>

    <UTable
      class="text-start"
      :data="profitItems"
      :columns="[
        { accessorKey: 'metric', header: '指标' },
        { accessorKey: 'value', header: '数值' },
      ]"
      :ui="{
        td: 'whitespace-normal',
      }"
    >
      <template #value-cell="{ row }">
        <DateTimeTZ v-if="row.original.isTs" :date="row.original.value" show-timezone />
        <template v-else>
          {{ row.original.value }}
        </template>
      </template>
    </UTable>
  </div>
</template>
