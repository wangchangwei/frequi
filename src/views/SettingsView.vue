<script setup lang="ts">
import { FtWsMessageTypes } from '@/types/wsMessageTypes';

const settingsStore = useSettingsStore();
const colorStore = useColorStore();
const layoutStore = useLayoutStore();

const timezoneOptions = ['UTC', Intl.DateTimeFormat().resolvedOptions().timeZone];
const openTradesOptions = [
  { value: OpenTradeVizOptions.showPill, text: '在图标中显示小圆点' },
  { value: OpenTradeVizOptions.asTitle, text: '在标题中显示数量' },
  { value: OpenTradeVizOptions.noOpenTrades, text: '不在标题中显示进行中的交易' },
];
const colorPreferenceOptions = [
  { value: ColorPreferences.GREEN_UP, text: '绿涨红跌 (国际主流)' },
  { value: ColorPreferences.RED_UP, text: '红涨绿跌 (国内习惯)' },
];

const resetDynamicLayout = () => {
  layoutStore.resetTradingLayout();
  layoutStore.resetDashboardLayout();
  showAlert('布局已成功重置。');
};
</script>

<template>
  <UCard class="mx-auto mt-3 p-4 max-w-4xl">
    <template #header><span class="text-2xl font-bold">FreqUI 设置</span></template>
    <div class="flex flex-col gap-4 text-start dark:text-neutral-300">
      <p class="text-left">UI 版本: {{ settingsStore.uiVersion }}</p>

      <div class="border border-neutral-400 rounded-sm p-4 space-y-4">
        <h4 class="text-xl font-semibold">界面设置</h4>

        <BaseCheckbox v-model="layoutStore.layoutLocked" class="space-y-1">
          锁定动态布局
          <template #hint>
            锁定动态布局，防止误触移动位置。也可以在顶部导航栏进行快捷锁定。
          </template>
        </BaseCheckbox>

        <div class="flex flex-row items-center gap-2 space-y-2">
          <UButton color="neutral" size="md" class="mb-0" @click="resetDynamicLayout"
            >重置布局</UButton
          >
          <small class="text-sm block text-neutral-600 dark:text-neutral-400"
            >将当前动态布局恢复到初始默认排列状态。</small
          >
        </div>

        <USeparator />

        <div class="space-y-1">
          <label class="block text-sm">在标题/页眉中显示进行中的交易数量</label>
          <USelect
            v-model="settingsStore.openTradesInTitle"
            :items="openTradesOptions"
            label-key="text"
            value-key="value"
            class="w-full"
          />
          <small class="text-sm text-neutral-600 dark:text-neutral-400"
            >设置是否以及如何展示当前正在运行中的交易持仓数量</small
          >
        </div>

        <div class="space-y-1">
          <label class="block text-sm">时区选择 (推荐 UTC)</label>
          <USelect v-model="settingsStore.timezone" :items="timezoneOptions" class="w-full" />
          <small class="text-sm text-neutral-600 dark:text-neutral-400"
            >选择界面展示时间的时区（推荐使用 UTC，因为各大交易所和机器日志默认为 UTC）</small
          >
        </div>

        <BaseCheckbox v-model="settingsStore.backgroundSync" class="space-y-1">
          后台数据同步
          <template #hint> 即使切换到其他机器人管理页面，仍保持此机器人的后台同步。 </template>
        </BaseCheckbox>

        <BaseCheckbox v-model="settingsStore.confirmDialog" class="space-y-1">
          手动强平交易时弹出确认窗口
          <template #hint
            >当手动强制平仓 (Force Exit) 时弹出确认提示，防止手误误操作。<br />
            开启后将在标题栏上方显示相应的安全警告图标。
          </template>
        </BaseCheckbox>

        <BaseCheckbox v-model="settingsStore.multiPaneButtonsShowText" class="space-y-1">
          在多面板操作按钮上显示文字说明
          <template #hint>在多面板控制按钮上显示具体的文本说明。关闭后将仅显示图标。</template>
        </BaseCheckbox>
      </div>

      <div class="border border-neutral-400 rounded-sm p-4 space-y-4">
        <h4 class="text-lg font-semibold">图表设置</h4>

        <div class="space-y-1">
          <label class="block text-sm">图表坐标轴显示位置</label>
          <URadioGroup
            v-model="settingsStore.chartLabelSide"
            :items="[
              { label: '左侧', value: 'left' },
              { label: '右侧', value: 'right' },
            ]"
            orientation="horizontal"
          />
          <small class="text-sm text-neutral-600 dark:text-neutral-400">
            K线价格坐标轴应该显示在左侧还是右侧？
          </small>
        </div>

        <BaseCheckbox v-model="settingsStore.useHeikinAshiCandles" class="space-y-1">
          使用平均足 (Heikin Ashi) K线
          <template #hint>在图表中使用平均足 K线进行平滑展示，代替传统 K线</template>
        </BaseCheckbox>

        <BaseCheckbox v-model="settingsStore.useReducedPairCalls" class="space-y-1">
          仅请求必需的数据列 (Reduced Columns)
          <template #hint
            >这可以显著减小回测等大型
            K线数据的网络传输体积。当绘图指标更改时，可能会触发二次网络请求。</template
          >
        </BaseCheckbox>

        <div>
          <p>默认单屏显示的 K 线根数（默认 250 根）</p>
          <div class="flex flex-row gap-5 w-full items-center">
            <USlider
              v-model="settingsStore.chartDefaultCandleCount"
              class="flex-1"
              :step="50"
              :min="100"
              :max="2000"
            />
            <UInputNumber
              v-model="settingsStore.chartDefaultCandleCount"
              :step="50"
              :min="100"
              :max="2000"
              size="sm"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="block">K线涨跌颜色偏好</label>
          <div class="flex flex-row gap-5 items-center">
            <URadioGroup
              v-model="colorStore.colorPreference"
              :items="colorPreferenceOptions"
              label-key="text"
              value-key="value"
              orientation="horizontal"
            >
              <template #label="{ item }">
                <div class="flex items-center">
                  <span class="mr-2">{{ item.text }}</span>
                  <UIcon
                    name="mdi:arrow-up-thin"
                    :color="
                      item.value === ColorPreferences.GREEN_UP
                        ? colorStore.colorProfit
                        : colorStore.colorLoss
                    "
                    class="-ml-2 size-5"
                  />
                  <UIcon
                    name="mdi:arrow-down-thin"
                    :color="
                      item.value === ColorPreferences.GREEN_UP
                        ? colorStore.colorLoss
                        : colorStore.colorProfit
                    "
                    class="-ml-2 size-5"
                  />
                </div>
              </template>
            </URadioGroup>
          </div>
        </div>
      </div>

      <div class="border rounded-sm border-neutral-400 p-4 space-y-4">
        <h4 class="text-lg font-semibold">通知设置</h4>
        <div class="space-y-2">
          <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.entryFill]">
            建仓/买入成交 (Entry Fill) 通知
          </BaseCheckbox>
          <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.exitFill]">
            平仓/卖出成交 (Exit Fill) 通知
          </BaseCheckbox>
          <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.entryCancel]">
            买入撤单 (Entry Cancel) 通知
          </BaseCheckbox>
          <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.exitCancel]">
            卖出撤单 (Exit Cancel) 通知
          </BaseCheckbox>
        </div>
      </div>

      <div class="border rounded-sm border-neutral-400 p-4 space-y-4">
        <h4 class="text-lg font-semibold">回测参数设置</h4>
        <div>
          <label for="backtestMetrics" class="block">回测明细分析指标</label>
          <USelectMenu
            multiple
            id="backtestMetrics"
            v-model="settingsStore.backtestAdditionalMetrics"
            :items="availableBacktestMetrics"
            label-key="header"
            value-key="field"
            class="w-full"
            display="chip"
          />
          <small class="text-sm text-neutral-600 dark:text-neutral-400"
            >在“按交易对/标签”列表里展示额外的回测统计指标。</small
          >
        </div>
      </div>
    </div>
  </UCard>
</template>
