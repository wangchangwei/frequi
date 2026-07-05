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

  // SpreadFilter 参数
  'max_spread_ratio': { description: '最大价差比例' },

  // PercentChangeFilter 参数
  'percent_value': { description: '百分比值' },
  'period': { description: '周期' },
  'candles': { description: '蜡烛数' },
  'weight': { description: '权重' },

  // RangeStabilityFilter 参数
  'lookback_days': { description: '回溯天数' },

  // ShuffleFilter 参数
  'shuffle_threshold': { description: '随机阈值' },
  'seed': { description: '随机种子' },

  // OffsetFilter 参数
  'offset': { description: '偏移量' },

  // VolumePairList 参数
  'volume_pairs_file': { description: '成交量交易对文件' },
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
  'side': { description: '方向' },

  // IDFilter 参数
  'min_idle_hours': { description: '最小空闲小时' },

  // MarketCapFilter 参数
  'market_cap_min': { description: '最小市值' },
  'market_cap_max': { description: '最大市值' },

  // ExchangeFilter 参数
  'exchange': { description: '交易所' },

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

  // 补充更多参数
  'method': { description: '方法' },
  'convert_mode': { description: '转换模式' },
  'data_directory': { description: '数据目录' },
  'number_rotate': { description: '轮换数量' },
  'sticky_pairs_only': { description: '仅粘性交易对' },
  'backside_fill': { description: '背面填充' },
  'use_adjustedPrices': { description: '使用调整价格' },
  'price_source': { description: '价格来源' },
  'use_custom_price': { description: '使用自定义价格' },
  'custom_price': { description: '自定义价格' },
  'tail_scale': { description: '尾部缩放' },
  'floor_balance': { description: '最低余额' },
  'ceiling_balance': { description: '最高余额' },
  'round_robin': { description: '轮询' },

  // 附加参数
  'asset_compatibility': { description: '资产兼容性' },
  'number_assets': { description: '资产数量' },
  'sort_direction': { description: '排序方向' },
  'min_trade_difference': { description: '最小交易差异' },
  'change_threshold': { description: '变化阈值' },
  'convert_balance': { description: '转换余额' },
  'dry_run': { description: '模拟运行' },

  // 筛选器通用
  'filter_for_trades': { description: '交易筛选' },
  'allow_internet': { description: '允许互联网' },

  // pairlistgenerator
  'enabled': { description: '启用' },
  'pairlist_name': { description: '配对列表名称' },
  'pairlist_group': { description: '配对列表组' },

  // AdditionalVolumePairList
  'aggregate': { description: '聚合' },
  'top_offset': { description: '顶部偏移' },
  'refresh_window': { description: '刷新窗口' },
  'max_distance_from_close': { description: '距收盘最大距离' },
  'distance_zone': { description: '距离区域' },
  'keep_intervals': { description: '保留间隔' },

  // MarketCapFilter
  'check_market_cap_stability': { description: '检查市值稳定性' },
  'market_cap_max_age': { description: '市值最大年龄' },

  // BollingerBands
  'band_params': { description: '布林带参数' },

  // IDFilter
  'min_trades': { description: '最小交易数' },
  'max_trades': { description: '最大交易数' },

  // QuotePairFilter / BaseSensor
  'quote_converter': { description: '报价转换器' },
  'base_converter': { description: '基础转换器' },
  'base_quote_translation': { description: '基础报价转换' },

  // 等等...
};

// help 文本翻译映射
const helpTranslations: Record<string, string> = {
  'Number of candles to use for calculations.': '用于计算的蜡烛数量。',
  'Use-candles setting for the pairlist.': '配对列表的蜡烛使用设置。',
  'Number of passes for the pairlist generator.': '配对列表生成器的通过次数。',
  'Number of pairs to keep in the whitelist.': '白名单中保留的交易对数量。',
  'Offset for start of the pairlist.': '配对列表的起始偏移。',
  'Minimum age of the pair in days to be considered.': '交易对被考虑的最小年龄（天）。',
  'Maximum age of the pair in days to be considered.': '交易对被考虑的最大年龄（天）。',
  'Minimal price to consider.': '考虑的最低价格。',
  'Maximum price to consider.': '考虑的最高价格。',
  'Minimal value to consider.': '考虑的最小值。',
  'Maximum value to consider.': '考虑的最大值。',
  'Maximum spread ratio to consider.': '考虑的最大价差比例。',
  'Period to use for PercentChangeFilter.': '百分比变化筛选器使用的周期。',
  'Percent value to use for PercentChangeFilter.': '百分比变化筛选器使用的百分比值。',
  'Number of lookback candles for RangeStabilityFilter.': '范围稳定性筛选器的回溯蜡烛数量。',
  'Window size for RangeStabilityFilter.': '范围稳定性筛选器的窗口大小。',
  'Minimum change to consider stable.': '考虑稳定的最小变化。',
  'Threshold for randomization.': '随机化阈值。',
  'Random seed for reproducibility.': '用于复现的随机种子。',
  'Offset to use for the OffsetFilter.': '偏移筛选器使用的偏移量。',
  'Sorted key to use for VolumePairList.': '成交量配对列表使用的排序键。',
  'Price precision to consider.': '考虑的价格精度。',
  'Size precision to consider.': '考虑的数量精度。',
  'Enable protection.': '启用保护。',
  'Stop duration in minutes.': '停止时长（分钟）。',
  'Cooldown duration in minutes.': '冷却时长（分钟）。',
  'Price side to use.': '使用的价格方向。',
  'Keep all pairs in the pairlist.': '保留配对列表中的所有交易对。',
  'Stake currency to use.': '使用的保证金货币。',
  'Order time in force to use.': '使用的订单时效。',
  'Minimum idle hours for IDFilter.': 'ID筛选器的最小空闲小时。',
  'Minimum market cap.': '最小市值。',
  'Maximum market cap.': '最大市值。',
  'Exchange to use.': '使用的交易所。',
  'Window to look back for stability.': '稳定性回溯窗口。',
  'Maximum change to consider stable.': '考虑稳定的最大变化。',
  'Bollinger band size.': '布林带大小。',
  'Bollinger band candles.': '布林带蜡烛数。',
  'Bollinger band standard deviation.': '布林带标准差。',
  'Check for price change.': '检查价格变化。',
  'Candles for price change check.': '价格变化检查的蜡烛数。',
  'Window size for descriptive stats filter.': '描述性统计筛选器的窗口大小。',
  'Maximum rate drop to allow.': '允许的最大跌幅。',
  'Number of candles to monitor.': '监控的蜡烛数量。',
  'Allow the current pair.': '允许当前交易对。',
  'Volatility to use.': '使用的波动率。',
  'Candles for volatility calculation.': '波动率计算的蜡烛数。',
  'Maximum volatility.': '最大波动率。',
  'Minimum volatility.': '最小波动率。',
  'Enable protection for the filter.': '为筛选器启用保护。',
  'Lookback period for RxFilter.': 'Rx筛选器的回溯周期。',
  'Maximum Rx rate for RxFilter.': 'Rx筛选器的最大Rx比率。',
  'Number format for the pairlist.': '配对列表的数字格式。',
  'Precision for the pairlist.': '配对列表的精度。',
  'Number of days to refresh.': '刷新的天数。',
  'Number of candles to use.': '使用的蜡烛数量。',
  'Number of passes to use.': '使用的通过次数。',
  'Number of pairs to select.': '选择的交易对数量。',
  'Length of the list.': '列表长度。',
  'Starting offset.': '起始偏移。',
  'Sticky zones to use.': '使用的粘性区域。',
  'Price standard deviations.': '价格标准差。',
  'Volatility standard deviations.': '波动率标准差。',
  'Resistance candles.': '阻力蜡烛数。',
  'Support candles.': '支撑蜡烛数。',
  'Maximum drawdown allowed.': '允许的最大回撤。',
  'Default order side.': '默认订单方向。',
  'Use MFI indicator.': '使用MFI指标。',
  'MFI period.': 'MFI周期。',
  'MFI threshold.': 'MFI阈值。',
};

function translateParam(param: PairlistParameter) {
  let description = param.description;
  let help: string | undefined = param.help;

  // 翻译 description
  if (paramTranslations[param.description]) {
    description = paramTranslations[param.description].description;
    if (paramTranslations[param.description].help) {
      help = paramTranslations[param.description].help;
    }
  }

  // 翻译 help 文本
  if (help && helpTranslations[help]) {
    help = helpTranslations[help];
  }

  return { description, help };
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
