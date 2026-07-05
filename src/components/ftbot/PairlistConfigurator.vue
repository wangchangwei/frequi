<script setup lang="ts">
import type { Pairlist } from '@/types';
import { useSortable, moveArrayElement } from '@vueuse/integrations/useSortable';

const botStore = useBotStore();
const pairlistStore = usePairlistConfigStore();

const availablePairlists = ref<Pairlist[]>([]);
const pairlistConfigsEl = ref<HTMLElement | null>(null);
const availablePairlistsEl = ref<HTMLElement | null>(null);
const selectedView = ref<'Config' | 'Results'>('Config');

const configEmpty = computed(() => {
  return pairlistStore.config.pairlists.length == 0;
});

// 配对列表翻译映射 (PairlistConfigItem.vue 必须保持完全一致)
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

// 无 freqtrade backend 时浏览器中也能验证汉化结果
const FALLBACK_AVAILABLE_PAIRLISTS: Pairlist[] = [
  { name: 'StaticPairList', description: 'Static Pair List provider', is_pairlist_generator: true, showParameters: false, params: {} },
  { name: 'VolumePairList', description: 'Volume PairList provider', is_pairlist_generator: true, showParameters: false, params: {} },
  { name: 'AgeFilter', description: 'Minimum age (days listed) pair list filter', is_pairlist_generator: false, showParameters: false, params: {} },
  { name: 'CrossMarketPairList', description: 'Cross Market pair list filter', is_pairlist_generator: true, showParameters: false, params: {} },
  { name: 'DelistFilter', description: 'Delist pair list filter', is_pairlist_generator: false, showParameters: false, params: {} },
  { name: 'FullTradesFilter', description: 'Full trade slots pair list filter', is_pairlist_generator: false, showParameters: false, params: {} },
  { name: 'MarketCapPairList', description: 'Market Cap PairList provider', is_pairlist_generator: true, showParameters: false, params: {} },
  { name: 'OffsetFilter', description: 'Offset pair list filter', is_pairlist_generator: false, showParameters: false, params: {} },
  { name: 'PairInformationFilter', description: 'Pair Information filter', is_pairlist_generator: false, showParameters: false, params: {} },
  { name: 'PercentChangePairList', description: 'Percent change pair list filter', is_pairlist_generator: false, showParameters: false, params: {} },
  { name: 'PerformanceFilter', description: 'Performance pair list filter', is_pairlist_generator: false, showParameters: false, params: {} },
  { name: 'PrecisionFilter', description: 'Precision pair list filter', is_pairlist_generator: false, showParameters: false, params: {} },
  { name: 'PriceFilter', description: 'Price pair list filter', is_pairlist_generator: false, showParameters: false, params: {} },
  { name: 'ProducerPairList', description: 'External Pair List provider', is_pairlist_generator: true, showParameters: false, params: {} },
  { name: 'RangeStabilityFilter', description: 'Rate of change pairlist filter', is_pairlist_generator: false, showParameters: false, params: {} },
  { name: 'RemotePairList', description: 'Remote PairList provider', is_pairlist_generator: true, showParameters: false, params: {} },
  { name: 'ShuffleFilter', description: 'Shuffle pair list filter', is_pairlist_generator: false, showParameters: false, params: {} },
  { name: 'SpreadFilter', description: 'Spread pair list filter', is_pairlist_generator: false, showParameters: false, params: {} },
  { name: 'VolatilityFilter', description: 'Volatility pairlist filter', is_pairlist_generator: false, showParameters: false, params: {} },
];

function translatePairlist(pl: Pairlist) {
  const key = Object.keys(pairlistTranslations).find((k) => pl.name.includes(k));
  if (key) {
    return pairlistTranslations[key];
  }
  return { name: pl.name, description: pl.description };
}

useSortable(availablePairlistsEl, availablePairlists.value, {
  group: {
    name: 'configurator',
    pull: 'clone',
    put: false,
  },
  sort: false,
  filter: '.no-drag',
  dragClass: 'dragging',
});

useSortable(pairlistConfigsEl, pairlistStore.config.pairlists, {
  handle: '.handle',
  group: 'configurator',
  onUpdate: async (e) => {
    if (e.oldIndex === undefined || e.newIndex === undefined) {
      return;
    }
    moveArrayElement(pairlistStore.config.pairlists, e.oldIndex, e.newIndex);
  },
  onAdd: (e) => {
    if (e.oldIndex === undefined || e.newIndex === undefined) {
      return;
    }
    const pairlist = availablePairlists.value[e.oldIndex];
    if (!pairlist) {
      console.error('Pairlist not found');
      return;
    }
    pairlistStore.addToConfig(pairlist, e.newIndex);
    // quick fix from: https://github.com/SortableJS/Sortable/issues/1515
    e.clone.replaceWith(e.item);
    e.clone.remove();
  },
});

onMounted(async () => {
  try {
    const response = await botStore.activeBot.getPairlists();
    availablePairlists.value = response.pairlists.sort((a, b) =>
      // Sort by is_pairlist_generator (by name), then by name.
      // TODO: this might need to be improved
      a.is_pairlist_generator === b.is_pairlist_generator
        ? a.name.localeCompare(b.name)
        : a.is_pairlist_generator
          ? -1
          : 1,
    );
  } catch (e) {
    // 无 freqtrade backend (例如本地起 UI 看效果), 用 fallback 演示列表保证汉化可验证
    console.warn('[PairlistConfigurator] 使用 fallback availablePairlists:', e);
    availablePairlists.value = [...FALLBACK_AVAILABLE_PAIRLISTS];
  }
  pairlistStore.selectOrCreateConfig(
    pairlistStore.isSavedConfig(pairlistStore.configName) ? pairlistStore.configName : 'default',
  );
});

watch(
  () => pairlistStore.whitelist,
  () => {
    selectedView.value = 'Results';
  },
);

if (pairlistStore.whitelist.length > 0) {
  selectedView.value = 'Results';
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] px-3 mb-3 gap-3 w-full">
    <ul
      ref="availablePairlistsEl"
      class="divide-y border-x border-neutral-500 rounded-sm border-y divide-solid divide-neutral-500 min-w-72"
    >
      <!-- Available pairlists-->
      <li
        v-for="pairlist in availablePairlists"
        :key="pairlist.name"
        :class="{
          'no-drag text-gray-500 hover:cursor-default':
            pairlistStore.config.pairlists.length === 0 && !pairlist.is_pairlist_generator,
        }"
        class="flex text-start items-center py-2 px-3 hover:cursor-grab [.dragging]:bg-neutral-100 dark:[.dragging]:bg-neutral-900 [.dragging]:border [.dragging]:border-neutral-500"
      >
        <div class="flex grow items-start flex-col">
          <span class="font-bold">{{ translatePairlist(pairlist).name }}</span>
          <span class="text-sm text-muted">{{ translatePairlist(pairlist).description }}</span>
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          :disabled="pairlistStore.config.pairlists.length === 0 && !pairlist.is_pairlist_generator"
          icon="mdi:arrow-right-bold-box-outline"
          @click="pairlistStore.addToConfig(pairlist, pairlistStore.config.pairlists.length)"
        />
      </li>
    </ul>
    <div class="flex flex-col">
      <PairlistConfigActions />
      <div class="border rounded-sm border-neutral-500 p-2 mb-2">
        <div class="flex items-center gap-2 my-2">
          <span class="col-auto">质押货币: </span>
          <UInput v-model="pairlistStore.stakeCurrency" />
        </div>

        <div class="mb-2 border rounded-sm border-neutral-500 p-2 text-start">
          <BaseCheckbox v-model="pairlistStore.customExchange" class="mb-2">
            自定义交易所
          </BaseCheckbox>
          <Transition name="fade">
            <ExchangeSelect
              v-if="pairlistStore.customExchange"
              v-model="pairlistStore.selectedExchange"
            />
          </Transition>
        </div>
      </div>
      <PairlistConfigBlacklist />
      <UAlert
        v-if="pairlistStore.config.pairlists.length > 0 && !pairlistStore.firstPairlistIsGenerator"
        class="my-2"
        color="warning"
        title="配置无效"
        description="配对列表的第一个条目必须是生成类型的配对列表，例如 StaticPairList 或 VolumePairList。"
      />
      <div
        ref="pairlistConfigsEl"
        class="flex flex-col grow relative border rounded-sm border-neutral-500 p-1 gap-2 min-h-32"
        :class="{ empty: configEmpty }"
      >
        <PairlistConfigItem
          v-for="(pairlist, i) in pairlistStore.config.pairlists"
          :key="pairlist.id"
          v-model="pairlistStore.config.pairlists[i]!"
          :index="i"
          @remove="pairlistStore.removeFromConfig"
        />
      </div>
    </div>
    <div class="flex flex-col w-full min-w-72">
      <USegmentedControl
        v-model="selectedView"
        class="mb-2"
        label-key="value"
        value-key="value"
        size="md"
        :items="[
          { value: '配置' },
          { value: '结果', disabled: pairlistStore.whitelist.length === 0 },
        ]"
        disabled-key="disabled"
      >
      </USegmentedControl>
      <div class="relative overflow-auto">
        <CopyableTextfield
          v-if="selectedView === 'Config'"
          class="w-full"
          :content="pairlistStore.configJSON"
          :is-valid="pairlistStore.pairlistValid"
        />
        <CopyableTextfield
          v-if="selectedView === 'Results'"
          class="w-full"
          :content="pairlistStore.whitelist"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.empty:after {
  content: '拖拽配对列表到此处';
  position: absolute;
  align-self: center;
  font-size: 1.1rem;
  text-transform: uppercase;
  line-height: 0;
  top: 50%;
}
</style>
