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

// 参数翻译映射
const paramTranslations: Record<string, { description: string; help?: string }> = {
  // 通用参数
  'number_format': { description: '数字格式' },
  'precision': { description: '精度' },
  'refresh_days': { description: '刷新天数' },
  'enabled': { description: '启用' },
  'candles': { description: '蜡烛数' },
  'use_candles': { description: '使用蜡烛数' },
  'passes': { description: '通过次数' },
  'num_pairs': { description: '交易对数量' },
  'list_length': { description: '列表长度' },
  'start_offset': { description: '起始偏移' },

  // AgeFilter 参数
  'min_age': { description: '最小年龄(天)' },
  'max_age': { description: '最大年龄(天)' },

  // PriceFilter 参数
  'min_price': { description: '最低价' },
  'max_price': { description: '最高价' },

  // ValueFilter 参数
  'min_value': { description: '最小值' },
  'max_value': { description: '最大值' },
  'filter_min_value': { description: '筛选最小值' },
  'filter_max_value': { description: '筛选最大值' },

  // SpreadFilter 参数
  'max_spread_ratio': { description: '最大价差比例' },

  // PercentChangeFilter 参数
  'percent_value': { description: '百分比值' },
  'period': { description: '周期' },
  'candles': { description: '蜡烛数' },
  'weight': { description: '权重' },

  // RangeStabilityFilter 参数
  'lookback_days': { description: '回溯天数' },
  'lookback_window': { description: '回溯窗口' },
  'min_change': { description: '最小变化' },

  // ShuffleFilter 参数
  'shuffle_threshold': { description: '随机阈值' },
  'seed': { description: '随机种子' },

  // OffsetFilter 参数
  'offset': { description: '偏移量' },

  // VolumePairList 参数
  'volume_pairs_file': { description: '成交量交易对文件' },
  'number_assets': { description: '资产数量' },
  'sort_key': { description: '排序键' },

  // PrecisionFilter 参数
  'price_precision': { description: '价格精度' },
  'size_precision': { description: '数量精度' },

  // StabilityFilter 参数
  'lookback_window': { description: '回溯窗口' },
  'min_change': { description: '最小变化' },
  'max_change': { description: '最大变化' },

  // BollingerBands 参数
  'band_size': { description: '布林带大小' },
  'band_candles': { description: '布林带蜡烛数' },
  'band_std': { description: '布林带标准差' },
  'check_change': { description: '检查变化' },
  'candles_change': { description: '蜡烛变化数' },

  // Descriptive stats filter
  'window_size': { description: '窗口大小' },
  'max_rate_drop': { description: '最大跌幅' },
  'monitor_candles': { description: '监控蜡烛数' },
  'allow_current_pair': { description: '允许当前交易对' },

  // Volatility 参数
  'volatility': { description: '波动率' },
  'candles_volatility': { description: '波动率蜡烛数' },
  'max_volatility': { description: '最大波动率' },
  'min_volatility': { description: '最小波动率' },

  // Protection 参数
  'protection_enabled': { description: '启用保护' },
  'stop_duration': { description: '停止时长' },
  'stop_duration_candles': { description: '停止时长(蜡烛)' },
  'cool_down_duration': { description: '冷却时长' },
  'cool_down_duration_candles': { description: '冷却时长(蜡烛)' },

  // RxFilter 参数
  'lookback_period': { description: '回溯周期' },
  'max_rx_rate': { description: '最大Rx比率' },

  // Misc 参数
  'price_side': { description: '价格方向' },
  'read_only': { description: '只读' },
  'keep_all_pairs': { description: '保留所有交易对' },
  'stake_currency': { description: '保证金货币' },
  'deadline': { description: '截止时间' },
  'order_time_in_force': { description: '订单时效' },
  'price_side': { description: '价格方向' },
  'side': { description: '方向' },

  // IDFilter 参数
  'min_idle_hours': { description: '最小空闲小时' },

  // MarketCapFilter 参数
  'market_cap_min': { description: '最小市值' },
  'market_cap_max': { description: '最大市值' },

  // ExchangeFilter 参数
  'exchange': { description: '交易所' },

  // SpreadFilter
  'max_spread_ratio': { description: '最大价差比例' },

  // 旧参数兼容
  'filter_min_value': { description: '筛选最小值' },
  'filter_max_value': { description: '筛选最大值' },
  '舔值': { description: '价差' },
  'spread': { description: '价差' },
  'order_price_percent': { description: '订单价格百分比' },
  'sticky_zones': { description: '粘性区域' },
  'price_stdevs': { description: '价格标准差' },
  'volatility_stdevs': { description: '波动率标准差' },
  'resistance_candles': { description: '阻力蜡烛数' },
  'support_candles': { description: '支撑蜡烛数' },
  'max_drawdown': { description: '最大回撤' },
  'default_order_side': { description: '默认订单方向' },
  'use_mfi': { description: '使用MFI' },
  'mfi_period': { description: 'MFI周期' },
  'mfi_threshold': { description: 'MFI阈值' },
};

function translateParam(param: PairlistParameter) {
  if (paramTranslations[param.description]) {
    return {
      description: paramTranslations[param.description].description,
      help: param.help,
    };
  }
  return { description: param.description, help: param.help };
}

const translatedParam = computed(() => translateParam(props.param));
</script>

<template>
  <div class="pb-1 flex flex-row text-start">
    <label class="w-2/5"> {{ translatedParam.description }}</label>
    <div class="flex flex-col w-full">
      <UFormField :help="translatedParam.help">
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
