<script setup lang="ts">
import type { Pairlist } from '@/types';

const pairlistStore = usePairlistConfigStore();

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

// 配对列表翻译映射 (PairlistConfigurator.vue 必须保持完全一致)
const pairlistTranslations: Record<string, { name: string; description: string }> = {
  // Generators
  StaticPairList: { name: '静态配对列表', description: '使用静态白名单' },
  VolumePairList: { name: '成交量配对列表', description: '按成交量筛选交易对' },
  CrossMarketPairList: { name: '跨市场配对列表', description: '使用其他市场的交易对' },
  MarketCapPairList: { name: '市值配对列表', description: '按市值筛选交易对' },
  ProducerPairList: { name: '主从配对列表', description: '从 Leader 数据获取配对列表' },
  RemotePairList: { name: '远程配对列表', description: '从远程数据源获取配对列表' },

  // Filters
  AgeFilter: { name: '交易对年龄筛选', description: '按交易对上线时间筛选' },
  DelistFilter: { name: '已下架交易对筛选', description: '过滤已下架或即将下架的交易对' },
  FullTradesFilter: { name: '满仓交易槽位筛选', description: '基于交易槽位占用情况筛选' },
  OffsetFilter: { name: '偏移筛选', description: '从列表中偏移/排除部分交易对' },
  PairInformationFilter: { name: '配对基础信息筛选', description: '基于配对基础信息筛选' },
  PercentChangeFilter: { name: '百分比变化筛选', description: '按百分比变化筛选' },
  PerformanceFilter: { name: '业绩筛选', description: '基于历史盈亏表现筛选' },
  PrecisionFilter: { name: '精度筛选', description: '按价格精度筛选' },
  PriceFilter: { name: '价格筛选', description: '按价格范围筛选' },
  RangeStabilityFilter: { name: '范围稳定性筛选', description: '按价格范围稳定性筛选' },
  ShuffleFilter: { name: '随机排序', description: '随机排序交易对' },
  SpreadFilter: { name: '价差筛选', description: '按买卖价差筛选' },
  VolatilityFilter: { name: '波动率筛选', description: '按价格波动率筛选' },

  // Deprecated (upstream 已移除, 保留以防代码引用)
  MutualListFilter: { name: '互斥配对列表筛选', description: '按两个 pairlist 互相过滤(已弃用)' },
  PairlistFilter: { name: '配对列表筛选', description: '使用另一个配对列表进行筛选(已弃用)' },
  WhiteListFilter: { name: '白名单筛选', description: '白名单筛选(已弃用)' },
};

function translatePairlist(pl: Pairlist) {
  const key = Object.keys(pairlistTranslations).find((k) => pl.name.includes(k));
  if (key) {
    return pairlistTranslations[key];
  }
  return { name: pl.name, description: pl.description };
}

const translatedPairlist = computed(() => translatePairlist(pairlist.value));
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
          <span class="font-bold">{{ translatedPairlist.name }}</span>
          <span class="text-sm">{{ translatedPairlist.description }}</span>
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
