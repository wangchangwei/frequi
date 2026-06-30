<script setup lang="ts">
import type { LookaheadResult } from '@/types';

const props = defineProps<{
  result: LookaheadResult;
}>();

const tableColumns = [
  { accessorKey: 'strategy', header: '策略', meta: { class: { td: 'font-mono' } } },
  { accessorKey: 'has_bias', header: '存在前瞻偏差' },
  { accessorKey: 'total_signals', header: '总信号数' },
  { accessorKey: 'biased_entry_signals', header: '受偏差影响的入场信号' },
  { accessorKey: 'biased_exit_signals', header: '受偏差影响的出场信号' },
  { accessorKey: 'biased_indicators', header: '受偏差影响的指标 (未来函数)' },
];

const tableData = computed(() => [
  {
    strategy: props.result.strategy,
    has_bias: props.result.has_bias,
    total_signals: props.result.total_signals,
    biased_entry_signals: props.result.biased_entry_signals,
    biased_exit_signals: props.result.biased_exit_signals,
    biased_indicators: props.result.biased_indicators ?? [],
  },
]);
</script>

<template>
  <div class="flex flex-col gap-3">
    <UAlert
      v-if="!result.has_bias"
      color="success"
      class="py-2"
      icon="i-mdi-check-circle"
      title="未检测到前瞻偏差"
      description="在所分析的时间范围内，策略生成的信号具有一致性。"
    />
    <UAlert
      v-else
      color="error"
      class="py-2"
      icon="i-mdi-alert"
      title="检测到前瞻偏差"
      description="策略根据可用数据的不同生成了不同的信号。此策略的回测结果很可能是不可靠的。"
    />

    <div>
      <UTable :data="tableData" :columns="tableColumns">
        <template #has_bias-cell="{ row }">
          <UBadge :color="row.original.has_bias ? 'error' : 'success'" variant="subtle">
            {{ row.original.has_bias ? '是' : '否' }}
          </UBadge>
        </template>
        <template #biased_indicators-cell="{ row }">
          <div v-if="row.original.biased_indicators.length > 0" class="flex flex-wrap gap-1">
            <UBadge
              v-for="ind in row.original.biased_indicators"
              :key="ind"
              color="warning"
              variant="subtle"
            >
              {{ ind }}
            </UBadge>
          </div>
          <span v-else class="text-neutral-500">-</span>
        </template>
      </UTable>
    </div>
  </div>
</template>
