<script setup lang="ts">
import type { Pairlist } from '@/types';

const pairlistStore = usePairlistConfigStore();

const pairlistTranslations: Record<string, { name: string; description: string }> = {
  StaticPairList: { name: '静态交易对 (Static)', description: '使用配置中预设的静态交易对列表。' },
  VolumePairList: { name: '交易量 (Volume)', description: '基于成交量动态生成交易对。' },
  ProducerPairList: { name: '生产者 (Producer)', description: '从生产者获取交易对列表。' },
  MarketCapPairList: { name: '市值 (MarketCap)', description: '基于市值排序动态生成交易对。' },
  AgeFilter: { name: '上市时间过滤 (Age)', description: '过滤掉上市时间过短的新币。' },
  VolatilityFilter: { name: '波动率过滤 (Volatility)', description: '过滤波动率过大或过小的交易对。' },
  PerformanceFilter: { name: '表现过滤 (Performance)', description: '基于历史交易表现过滤交易对。' },
  PrecisionFilter: { name: '精度过滤 (Precision)', description: '过滤掉不满足价格或数量精度的交易对。' },
  PriceFilter: { name: '价格过滤 (Price)', description: '过滤价格过低或过高的交易对。' },
  SpreadFilter: { name: '价差过滤 (Spread)', description: '过滤买卖价差过大的交易对。' },
  ShuffleFilter: { name: '随机打乱 (Shuffle)', description: '将交易对列表的顺序随机打乱。' },
  RangeStabilityFilter: { name: '区间稳定性过滤 (RangeStability)', description: '基于价格波动区间的稳定性进行过滤。' },
  OffsetFilter: { name: '偏移过滤 (Offset)', description: '使用偏移量跳过列表前面的交易对。' },
  FullTradesFilter: { name: '全周期交易过滤 (FullTrades)', description: '移除无法覆盖指定时间周期的交易对。' },
  CorrelationsFilter: { name: '相关性过滤 (Correlations)', description: '过滤与特定币种高度相关的交易对。' }
};

defineProps<{
  index: number;
}>();

const pairlist = defineModel<Pairlist>({ required: true });

const hasParameters = computed(() => Object.keys(pairlist.value.params).length > 0);

function toggleVisible() {
  if (hasParameters.value) {
    pairlist.value.showParameters = !pairlist.value.showParameters;
  }
}
</script>

<template>
  <div class="shadow-sm rounded-sm border border-neutral-300 dark:border-neutral-700">
    <div
      class="flex w-full text-start items-center bg-neutral-200 dark:bg-neutral-700 p-2 border-b border-neutral-300 dark:border-neutral-600"
    >
      <div class="flex grow items-center">
        <i-mdi-reorder-horizontal
          role="button"
          class="handle me-2 ms-2 flex-auto shrink"
          width="24"
          height="24"
        />
        <div
          role="button"
          class="flex items-start flex-col user-select-none w-full"
          @click="toggleVisible"
        >
          <span class="font-bold">{{ pairlistTranslations[pairlist.name]?.name || pairlist.name }}</span>
          <span class="text-sm">{{ pairlistTranslations[pairlist.name]?.description || pairlist.description }}</span>
        </div>
      </div>
      <i-mdi-close
        role="button"
        width="24"
        height="24"
        class="mx-2"
        @click="pairlistStore.removeFromConfig(index)"
      />
      <i-mdi-chevron-down
        v-if="!pairlist.showParameters"
        :class="hasParameters && !pairlist.showParameters ? 'visible' : 'invisible'"
        role="button"
        class="fs-4"
        @click="toggleVisible"
      />
      <i-mdi-chevron-up
        v-if="pairlist.showParameters"
        :class="hasParameters && pairlist.showParameters ? 'visible' : 'invisible'"
        role="button"
        class="fs-4"
        @click="toggleVisible"
      />
    </div>
    <Transition>
      <div v-if="pairlist.showParameters" class="p-2 space-y-1">
        <PairlistConfigParameter
          v-for="(parameter, key) in pairlist.params"
          :key="key"
          v-model="parameter.value"
          :param="parameter"
        />
      </div>
    </Transition>
  </div>
</template>
