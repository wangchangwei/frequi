<script setup lang="ts">
import type { PairlistParameter } from '@/types';
import { PairlistParamType } from '@/types';

const props = defineProps<{
  param: PairlistParameter;
}>();

// TODO: type should really be PairlistParamValue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const paramValue = defineModel<any>();

const options = computed(() => {
  if (props.param.type === PairlistParamType.option) {
    return props.param.options.map((option) => (option === '' ? null : option)) ?? [];
  }
  return [];
});

const paramTranslations: Record<string, string> = {
  'Number of assets': '资产数量 (Number of assets)',
  'Sort key': '排序依据 (Sort key)',
  'Minimum value': '最小值 (Minimum value)',
  'Maximum value': '最大值 (Maximum value)',
  'Lookback Days': '回溯天数 (Lookback Days)',
  'Lookback Timeframe': '回溯K线周期 (Lookback Timeframe)',
  'Lookback Period': '回溯周期数 (Lookback Period)',
  'Refresh period': '刷新周期 (Refresh period)',
  'Minimum Days Listed': '上市最短天数 (Minimum Days Listed)',
  'Maximum Days Listed': '上市最长天数 (Maximum Days Listed)',
  'Minimum Volatility': '最低波动率 (Minimum Volatility)',
  'Maximum Volatility': '最高波动率 (Maximum Volatility)',
  'Sort pairlist': '对交易对列表排序 (Sort pairlist)',
  'Minutes': '分钟 (Minutes)',
  'Minimum profit': '最低利润 (Minimum profit)',
  'Shuffle frequency': '打乱频率 (Shuffle frequency)',
  'Random Seed': '随机数种子 (Random Seed)',
  'Allow inactive pairs': '允许已下架/非活跃交易对 (Allow inactive pairs)',
  'Max spread ratio': '最大价差比率 (Max spread ratio)',
  'Max days from now': '距今最大天数 (Max days from now)',
  'Offset': '偏移量 (Offset)',
  'Minimum Rate of Change': '最低变化率 (Minimum Rate of Change)',
  'Maximum Rate of Change': '最高变化率 (Maximum Rate of Change)',
  'Max rank of assets': '最大资产排名 (Max rank of assets)',
  'Coin Categories': '币种分类 (Coin Categories)',
  'Mode of operation': '运行模式 (Mode of operation)',
  'Low price ratio': '最低价格比率 (Low price ratio)',
  'Maximum Value percentage': '最大值百分比 (Maximum Value percentage)',
  'URL to fetch pairlist from': '获取列表的 URL',
  'Pairlist mode': '列表模式',
  'Processing mode': '处理模式',
  'Keep last pairlist on failure': '失败时保留旧列表',
  'Read timeout': '读取超时',
  'Bearer token': '访问令牌 (Token)',
  'Producer name': '生产者名称',
};

const translatedLabel = computed(() => {
  return paramTranslations[props.param.description] || props.param.description;
});
</script>

<template>
  <div class="pb-1 flex flex-row text-start">
    <label class="w-2/5"> {{ translatedLabel }}</label>
    <div class="flex flex-col w-full">
      <UFormField :help="param.help">
        <UInput
          v-if="param.type === PairlistParamType.string || param.type === PairlistParamType.number"
          v-model="paramValue"
          class="w-full"
        ></UInput>

        <BaseCheckbox
          v-if="param.type === PairlistParamType.boolean"
          v-model="paramValue"
          class="w-full"
        ></BaseCheckbox>

        <USelect
          v-if="param.type === PairlistParamType.option"
          v-model="paramValue"
          :items="options"
          class="w-full"
        ></USelect>
        <BaseStringList
          v-if="param.type === PairlistParamType.list"
          v-model="paramValue"
          class="w-full"
        ></BaseStringList>
      </UFormField>
    </div>
  </div>
</template>
