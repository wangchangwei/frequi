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

// 配对列表翻译映射
const pairlistTranslations: Record<string, { name: string; description: string }> = {
  StaticPairList: { name: '静态配对列表', description: '使用静态白名单' },
  VolumePairList: { name: '成交量配对列表', description: '按成交量筛选交易对' },
  AgeFilter: { name: '交易对年龄筛选', description: '按交易对上线时间筛选' },
  PrecisionFilter: { name: '精度筛选', description: '按价格精度筛选' },
  PriceFilter: { name: '价格筛选', description: '按价格范围筛选' },
  ShuffleFilter: { name: '随机排序', description: '随机排序交易对' },
  PercentChangeFilter: { name: '百分比变化筛选', description: '按百分比变化筛选' },
  SpreadFilter: { name: '价差筛选', description: '按买卖价差筛选' },
  VolumePairList: { name: '成交量配对列表', description: '按成交量筛选交易对' },
  RangeStabilityFilter: { name: '范围稳定性筛选', description: '按价格范围稳定性筛选' },
  OffsetFilter: { name: '偏移筛选', description: '从列表中偏移/排除部分交易对' },
  MutualListFilter: { name: ' mutual list filter', description: ' filter by mutual list' },
  PairlistFilter: { name: '配对列表筛选', description: '使用另一个配对列表进行筛选' },
  WhiteListFilter: { name: '白名单筛选', description: '白名单筛选' },
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
