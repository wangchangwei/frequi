<script setup lang="ts">
import type { LookaheadAnalysisPayload } from '@/types';

const props = defineProps<{
  running: boolean;
}>();

const emit = defineEmits<{
  start: [payload: LookaheadAnalysisPayload];
}>();

const botStore = useBotStore();
const btStore = useBtStore();

const canStart = computed(
  () => !!btStore.strategy && !props.running && botStore.activeBot.canRunBacktest,
);

function emitStart() {
  const payload: LookaheadAnalysisPayload = {
    strategy: btStore.strategy,
    minimum_trade_amount: btStore.lookaheadMinTradeAmount,
    targeted_trade_amount: btStore.lookaheadTargetedTradeAmount,
    lookahead_allow_limit_orders: btStore.lookaheadAllowLimitOrders,
  };
  if (btStore.selectedTimeframe) {
    payload.timeframe = btStore.selectedTimeframe;
  }
  if (btStore.timerange) {
    payload.timerange = btStore.timerange;
  }
  emit('start', payload);
}

onMounted(() => {
  if (botStore.activeBot.strategyList.length === 0) {
    botStore.activeBot.getStrategyList();
  }
});
</script>

<template>
  <div>
    <UAlert
      color="info"
      class="mb-3 py-2"
      title="前瞻偏差分析 (Lookahead analysis)"
      description="通过比较在完整数据集上生成的信号与在逐渐缩短的时间范围内生成的信号，来检查策略是否存在前瞻偏差（未来函数）。如果指标或信号会随着未来数据的变化而改变，则说明存在前瞻偏差，这会导致回测结果不可靠。"
    />

    <div class="flex flex-col gap-3">
      <div>
        <span class="font-bold">策略</span>
        <StrategySelect v-model="btStore.strategy" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        <label for="lookahead-timeframe" class="md:text-right">时间周期:</label>
        <TimeframeSelect id="lookahead-timeframe" v-model="btStore.selectedTimeframe" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        <div class="flex items-center gap-2 md:justify-end">
          <label for="lookahead-minimum-trade-amount" class="font-bold">最少交易数量:</label>
          <InfoBox hint="在评估前瞻偏差之前，分析应该运行的最少交易次数。" />
        </div>
        <UInput
          id="lookahead-minimum-trade-amount"
          v-model.number="btStore.lookaheadMinTradeAmount"
          type="number"
          min="1"
          class="w-full"
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        <div class="flex items-center gap-2 md:justify-end">
          <label for="lookahead-targeted-trade-amount" class="font-bold">目标交易数量:</label>
          <InfoBox hint="分析尝试达到的目标交易次数。必须大于或等于最少交易数量。" />
        </div>
        <UInput
          id="lookahead-targeted-trade-amount"
          v-model.number="btStore.lookaheadTargetedTradeAmount"
          type="number"
          min="1"
          class="w-full"
        />
      </div>

      <div class="flex items-center gap-2">
        <UCheckbox id="lookahead-allow-limit-orders" v-model="btStore.lookaheadAllowLimitOrders" />
        <label for="lookahead-allow-limit-orders">允许限价单</label>
        <InfoBox hint="在前瞻偏差分析中允许限价单（可能会导致分析结果中出现误报）。" />
      </div>

      <TimeRangeSelect v-model="btStore.timerange" class="mx-auto mt-1" />

      <div class="flex justify-center mt-2">
        <UButton
          icon="i-mdi-play"
          variant="solid"
          :loading="running"
          :disabled="!canStart"
          @click="emitStart"
        >
          开始前瞻偏差分析
        </UButton>
      </div>
    </div>
  </div>
</template>
