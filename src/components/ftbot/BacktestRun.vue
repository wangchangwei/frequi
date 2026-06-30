<script setup lang="ts">
import type { BacktestPayload } from '@/types';

const botStore = useBotStore();
const btStore = useBtStore();

function clickBacktest() {
  const btPayload: BacktestPayload = {
    strategy: btStore.strategy,
    timerange: btStore.timerange,
    enable_protections: btStore.enableProtections,
  };
  if (btStore.maxOpenTrades) {
    btPayload.max_open_trades = btStore.maxOpenTrades;
  }
  if (btStore.stakeAmountUnlimited) {
    btPayload.stake_amount = 'unlimited';
  } else {
    const stakeAmountLoc = Number(btStore.stakeAmount);
    if (stakeAmountLoc) {
      btPayload.stake_amount = stakeAmountLoc.toString();
    }
  }

  const startingCapitalLoc = Number(btStore.startingCapital);
  if (startingCapitalLoc) {
    btPayload.dry_run_wallet = startingCapitalLoc;
  }

  if (btStore.selectedTimeframe) {
    btPayload.timeframe = btStore.selectedTimeframe;
  }
  if (btStore.selectedDetailTimeframe) {
    btPayload.timeframe_detail = btStore.selectedDetailTimeframe;
  }
  if (!btStore.allowCache) {
    btPayload.backtest_cache = 'none';
  }
  if (btStore.freqAI.enabled) {
    btPayload.freqaimodel = btStore.freqAI.model;
    if (btStore.freqAI.identifier !== '') {
      btPayload.freqai = { identifier: btStore.freqAI.identifier };
    }
  }

  botStore.activeBot.startBacktest(btPayload);
}
const pairlistStore = usePairlistConfigStore();

function clickQueueBacktest() {
  const btPayload: BacktestPayload = {
    strategy: btStore.strategy,
    timerange: btStore.timerange,
  };
  if (btStore.selectedTimeframe) {
    btPayload.timeframe = btStore.selectedTimeframe;
  }
  if (btStore.selectedDetailTimeframe) {
    btPayload.timeframe_detail = btStore.selectedDetailTimeframe;
  }
  if (btStore.freqAI.enabled) {
    btPayload.freqaimodel = btStore.freqAI.model;
    if (btStore.freqAI.identifier !== '') {
      btPayload.freqai = { identifier: btStore.freqAI.identifier };
    }
  }
  btPayload.pairs = pairlistStore.whitelist.join(',');
  botStore.activeBot.startQueueBacktest(btPayload);
}
</script>

<template>
  <div class="mb-2">
    <span>策略</span>
    <StrategySelect v-model="btStore.strategy"></StrategySelect>
  </div>
  <div
    class="grid grid-cols-2 border border-neutral-500 rounded-sm gap-y-2 gap-2 items-center p-1 pt-3"
    :disabled="botStore.activeBot.backtestRunning"
  >
    <!-- Backtesting parameters -->
    <h3 class="font-bold mb-2 col-span-2 text-center">回测参数设置</h3>
    <label for="timeframe-select">K线周期:</label>
    <TimeframeSelect id="timeframe-select" v-model="btStore.selectedTimeframe" />
    <label for="timeframe-detail-select" class="flex justify-end items-center gap-2"
      >细节K线周期:
      <InfoBox
        hint="细节K线周期（如 1m），用于高精度模拟K线内部的交易表现。如果不设置，则不启用此功能。"
      />
    </label>
    <TimeframeSelect
      id="timeframe-detail-select"
      v-model="btStore.selectedDetailTimeframe"
      :below-timeframe="btStore.selectedTimeframe"
    />

    <label for="max-open-trades">最大持仓单数:</label>
    <UInputNumber
      id="max-open-trades"
      v-model="btStore.maxOpenTrades"
      placeholder="使用策略默认值"
      :increment="false"
      :decrement="false"
    ></UInputNumber>
    <label for="starting-capital">初始资金:</label>
    <UInputNumber
      id="starting-capital"
      v-model="btStore.startingCapital"
      placeholder="使用配置默认值"
      :increment="false"
      :decrement="false"
      :step="10"
      :min="0"
      :stepSnapping="false"
      :format-options="{
        maximumFractionDigits: 5,
      }"
    ></UInputNumber>
    <label for="stake-amount-bool">每单投资额:</label>
    <div class="flex items-center">
      <BaseCheckbox class="basis-1/3" id="stake-amount-bool" v-model="btStore.stakeAmountUnlimited"
        >无限制</BaseCheckbox
      >
      <UInputNumber
        id="stake-amount"
        v-model="btStore.stakeAmount"
        placeholder="使用策略默认值"
        class="w-full"
        :step="10"
        :stepSnapping="false"
        :format-options="{
          maximumFractionDigits: 5,
        }"
        :min="0"
        :increment="false"
        :decrement="false"
        :disabled="btStore.stakeAmountUnlimited"
      ></UInputNumber>
    </div>

    <label for="enable-protections">启用保护策略 (Protections):</label>
    <BaseCheckbox id="enable-protections" v-model="btStore.enableProtections"></BaseCheckbox>
    <template v-if="botStore.activeBot.botFeatures.backtestFreqAI">
      <label for="enable-cache">缓存回测结果:</label>
      <BaseCheckbox id="enable-cache" v-model="btStore.allowCache"></BaseCheckbox>
    </template>

    <FreqAIModelInput
      v-if="botStore.activeBot.botFeatures.backtestFreqAI"
      v-model="btStore.freqAI"
    />

    <USeparator class="col-span-2 my-2" />
    <TimeRangeSelect v-model="btStore.timerange" class="mx-auto mt-2 col-span-2"></TimeRangeSelect>
  </div>

  <h3 class="mt-3 font-bold text-2xl">回测控制</h3>
  <div class="flex flex-wrap md:flex-nowrap justify-between md:justify-center mt-2">
    <UButton
      id="start-backtest"
      variant="solid"
      icon="mdi:play"
      :disabled="
        !btStore.canRunBacktest ||
        botStore.activeBot.backtestRunning ||
        !botStore.activeBot.canRunBacktest
      "
      class="mx-1"
      @click="clickBacktest"
    >
      开始回测
    </UButton>
    <UButton
      id="start-queue-backtest"
      variant="solid"
      color="primary"
      :icon="
        botStore.activeBot.queueBacktestStatus === 'running' ? 'mdi:loading' : 'mdi:play-speed'
      "
      :disabled="
        botStore.activeBot.backtestRunning ||
        !botStore.activeBot.canRunBacktest ||
        pairlistStore.whitelist.length === 0
      "
      class="mx-1"
      @click="clickQueueBacktest"
    >
      <template v-if="botStore.activeBot.queueBacktestStatus === 'running'">
        队列回测中 {{ Math.round(botStore.activeBot.backtestProgress * 100) }}%
      </template>
      <template v-else>开始队列回测</template>
    </UButton>
    <UButton
      color="neutral"
      icon="mdi:refresh"
      :disabled="botStore.activeBot.backtestRunning || !botStore.activeBot.canRunBacktest"
      class="mx-1"
      @click="botStore.activeBot.pollBacktest()"
    >
      加载最新回测结果
    </UButton>
    <UButton
      color="neutral"
      icon="mdi:stop"
      class="mx-1"
      :disabled="!botStore.activeBot.backtestRunning"
      @click="
        botStore.activeBot.queueBacktestStatus === 'running'
          ? botStore.activeBot.stopQueueBacktest()
          : botStore.activeBot.stopBacktest()
      "
    >
      停止回测
    </UButton>
    <UButton
      color="neutral"
      class="mx-1"
      icon="mdi:delete"
      :disabled="botStore.activeBot.backtestRunning || !botStore.activeBot.canRunBacktest"
      @click="botStore.activeBot.removeBacktest()"
    >
      重置回测
    </UButton>
  </div>
</template>
<style lang="css" scoped>
label {
  @apply text-right;
}
</style>
