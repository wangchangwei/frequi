<script setup lang="ts">
import type { Pairlist } from '@/types';
import { useSortable, moveArrayElement } from '@vueuse/integrations/useSortable';

const botStore = useBotStore();
const pairlistStore = usePairlistConfigStore();

const pairlistTranslations: Record<string, { name: string; description: string }> = {
  StaticPairList: { name: '静态交易对 (Static)', description: '使用配置中预设的静态交易对列表。' },
  VolumePairList: { name: '交易量 (Volume)', description: '基于成交量动态生成交易对。' },
  ProducerPairList: { name: '生产者 (Producer)', description: '从生产者获取交易对列表。' },
  MarketCapPairList: { name: '市值 (MarketCap)', description: '基于市值排序动态生成交易对。' },
  AgeFilter: { name: '上市时间过滤 (Age)', description: '过滤掉上市时间过短的新币。' },
  VolatilityFilter: {
    name: '波动率过滤 (Volatility)',
    description: '过滤波动率过大或过小的交易对。',
  },
  PerformanceFilter: {
    name: '表现过滤 (Performance)',
    description: '基于历史交易表现过滤交易对。',
  },
  PrecisionFilter: {
    name: '精度过滤 (Precision)',
    description: '过滤掉不满足价格或数量精度的交易对。',
  },
  PriceFilter: { name: '价格过滤 (Price)', description: '过滤价格过低或过高的交易对。' },
  SpreadFilter: { name: '价差过滤 (Spread)', description: '过滤买卖价差过大的交易对。' },
  ShuffleFilter: { name: '随机打乱 (Shuffle)', description: '将交易对列表的顺序随机打乱。' },
  RangeStabilityFilter: {
    name: '区间稳定性过滤 (RangeStability)',
    description: '基于价格波动区间的稳定性进行过滤。',
  },
  OffsetFilter: { name: '偏移过滤 (Offset)', description: '使用偏移量跳过列表前面的交易对。' },
  FullTradesFilter: {
    name: '全周期交易过滤 (FullTrades)',
    description: '移除无法覆盖指定时间周期的交易对。',
  },
  CorrelationsFilter: {
    name: '相关性过滤 (Correlations)',
    description: '过滤与特定币种高度相关的交易对。',
  },
};

const availablePairlists = ref<Pairlist[]>([]);
const pairlistConfigsEl = ref<HTMLElement | null>(null);
const availablePairlistsEl = ref<HTMLElement | null>(null);
const selectedView = ref<'Config' | 'Results'>('Config');

const configEmpty = computed(() => {
  return pairlistStore.config.pairlists.length == 0;
});

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
  availablePairlists.value = (await botStore.activeBot.getPairlists()).pairlists.sort((a, b) =>
    // Sort by is_pairlist_generator (by name), then by name.
    // TODO: this might need to be improved
    a.is_pairlist_generator === b.is_pairlist_generator
      ? a.name.localeCompare(b.name)
      : a.is_pairlist_generator
        ? -1
        : 1,
  );
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
          <span class="font-bold">{{
            pairlistTranslations[pairlist.name]?.name || pairlist.name
          }}</span>
          <span class="text-sm text-muted">{{
            pairlistTranslations[pairlist.name]?.description || pairlist.description
          }}</span>
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
          <span class="col-auto">结算货币: </span>
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
        description="交易对列表中的第一项必须是生成型列表，例如 StaticPairList 或 VolumePairList。"
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
        label-key="label"
        value-key="value"
        size="md"
        :items="[
          { label: '配置代码', value: 'Config' },
          { label: '计算结果', value: 'Results', disabled: pairlistStore.whitelist.length === 0 },
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
  content: '拖拽交易对列表至此处';
  position: absolute;
  align-self: center;
  font-size: 1.1rem;
  text-transform: uppercase;
  line-height: 0;
  top: 50%;
}
</style>
