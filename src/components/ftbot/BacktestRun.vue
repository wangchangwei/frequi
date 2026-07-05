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
    <h3 class="font-bold mb-2 col-span-2 text-center">回测参数</h3>
    <label for="timeframe-select">时间周期:</label>
    <TimeframeSelect id="timeframe-select" v-model="btStore.selectedTimeframe" />
    <label for="timeframe-detail-select" class="flex justify-end items-center gap-2"
      >详细时间周期:
      <InfoBox
        hint="Detail timeframe, to simulate intra-candle results. Not setting this will not use this functionality."
      />
    </label>
    <TimeframeSelect
      id="timeframe-detail-select"
      v-model="btStore.selectedDetailTimeframe"
      :below-timeframe="btStore.selectedTimeframe"
    />

    <label for="max-open-trades">最大交易数:</label>
    <UInputNumber
      id="max-open-trades"
      v-model="btStore.maxOpenTrades"
      placeholder="Use strategy default"
      :increment="false"
      :decrement="false"
    ></UInputNumber>
    <label for="starting-capital">起始资金:</label>
    <UInputNumber
      id="starting-capital"
      v-model="btStore.startingCapital"
      placeholder="Use config default"
      :increment="false"
      :decrement="false"
      :step="10"
      :min="0"
      :stepSnapping="false"
      :format-options="{
        maximumFractionDigits: 5,
      }"
    ></UInputNumber>
    <label for="stake-amount-bool">质押金额:</label>
    <div class="flex items-center">
      <BaseCheckbox class="basis-1/3" id="stake-amount-bool" v-model="btStore.stakeAmountUnlimited"
        >无限质押</BaseCheckbox
      >
      <UInputNumber
        id="stake-amount"
        v-model="btStore.stakeAmount"
        placeholder="Use strategy default"
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

    <label for="enable-protections">启用保护:</label>
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

  <h3 class="mt-3 font-bold text-2xl">回测汇总</h3>
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
      color="neutral"
      icon="mdi:refresh"
      :disabled="botStore.activeBot.backtestRunning || !botStore.activeBot.canRunBacktest"
      class="mx-1"
      @click="botStore.activeBot.pollBacktest()"
    >
      加载回测结果
    </UButton>
    <UButton
      color="neutral"
      icon="mdi:stop"
      class="mx-1"
      :disabled="!botStore.activeBot.backtestRunning"
      @click="botStore.activeBot.stopBacktest()"
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
