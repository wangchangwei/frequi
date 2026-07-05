<script setup lang="ts">
import { FtWsMessageTypes } from '@/types/wsMessageTypes';

const settingsStore = useSettingsStore();
const colorStore = useColorStore();
const layoutStore = useLayoutStore();

const timezoneOptions = ['UTC', Intl.DateTimeFormat().resolvedOptions().timeZone];
const openTradesOptions = [
  { value: OpenTradeVizOptions.showPill, text: '在图标中显示药丸' },
  { value: OpenTradeVizOptions.asTitle, text: '在标题中显示' },
  { value: OpenTradeVizOptions.noOpenTrades, text: '不在标题栏显示交易' },
];
const colorPreferenceOptions = [
  { value: ColorPreferences.GREEN_UP, text: '绿涨/红跌' },
  { value: ColorPreferences.RED_UP, text: '红涨/绿跌' },
];

const resetDynamicLayout = () => {
  layoutStore.resetTradingLayout();
  layoutStore.resetDashboardLayout();
  showAlert('Layouts have been reset.');
};
</script>

<template>
  <UCard class="mx-auto mt-3 p-4 max-w-4xl">
    <template #header><span class="text-2xl font-bold">FreqUI 设置</span></template>
    <div class="flex flex-col gap-4 text-start dark:text-neutral-300">
      <p class="text-left">UI Version: {{ settingsStore.uiVersion }}</p>

      <div class="border border-neutral-400 rounded-sm p-4 space-y-4">
        <h4 class="text-xl font-semibold">界面设置</h4>

        <BaseCheckbox v-model="layoutStore.layoutLocked" class="space-y-1">
          锁定动态布局
          <template #hint>
            锁定动态布局，这样它们就不能再移动了。也可以在顶部导航栏设置。
          </template>
        </BaseCheckbox>

        <div class="flex flex-row items-center gap-2 space-y-2">
          <UButton color="neutral" size="md" class="mb-0" @click="resetDynamicLayout"
            >重置布局</UButton
          >
          <small class="text-sm block text-neutral-600 dark:text-neutral-400"
            >将动态布局重置为初始状态。</small
          >
        </div>

        <USeparator />

        <div class="space-y-1">
          <label class="block text-sm">在标题栏显示交易</label>
          <USelect
            v-model="settingsStore.openTradesInTitle"
            :items="openTradesOptions"
            label-key="text"
            value-key="value"
            class="w-full"
          />
          <small class="text-sm text-neutral-600 dark:text-neutral-400"
            >决定是否可视化未平仓交易</small
          >
        </div>

        <div class="space-y-1">
          <label class="block text-sm">UTC 时区</label>
          <USelect v-model="settingsStore.timezone" :items="timezoneOptions" class="w-full" />
          <small class="text-sm text-neutral-600 dark:text-neutral-400"
            >选择时区（建议使用 UTC，因为交易所通常在 UTC 时间工作）</small
          >
        </div>

        <BaseCheckbox v-model="settingsStore.backgroundSync" class="space-y-1">
          后台同步
          <template #hint> 当选择其他机器人时保持后台同步运行。 </template>
        </BaseCheckbox>

        <BaseCheckbox v-model="settingsStore.confirmDialog" class="space-y-1">
          交易强退时显示确认对话框
          <template #hint
            >强制退出交易时使用确认对话框。<br />
            这也会在标题栏显示 <i-mdi-run-fast class="text-yellow-300 inline" />
            <i-mdi-alert class="text-yellow-300 inline" />。
          </template>
        </BaseCheckbox>

        <BaseCheckbox v-model="settingsStore.multiPaneButtonsShowText" class="space-y-1">
          多窗格按钮显示文字
          <template #hint
            >在多窗格按钮上显示文字。如果禁用，则只显示图标。</template
          >
        </BaseCheckbox>
      </div>

      <div class="border border-neutral-400 rounded-sm p-4 space-y-4">
        <h4 class="text-lg font-semibold">图表设置</h4>

        <div class="space-y-1">
          <label class="block text-sm">图表刻度侧</label>
          <URadioGroup
            v-model="settingsStore.chartLabelSide"
            :items="[
              { label: 'Left', value: 'left' },
              { label: 'Right', value: 'right' },
            ]"
            orientation="horizontal"
          />
          <small class="text-sm text-neutral-600 dark:text-neutral-400">
            刻度应该显示在右侧还是左侧？
          </small>
        </div>

        <BaseCheckbox v-model="settingsStore.useHeikinAshiCandles" class="space-y-1">
          使用平均 K 线蜡烛
          <template #hint>在图表中使用平均 K 线蜡烛</template>
        </BaseCheckbox>

        <BaseCheckbox v-model="settingsStore.useReducedPairCalls" class="space-y-1">
          仅请求必要的列
          <template #hint
            >可以减少大型数据帧的传输大小。如果图表配置更改，可能需要额外的调用。</template
          >
        </BaseCheckbox>

        <div>
          <p>默认显示的蜡烛数量（默认为 250）</p>
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
          <label class="block">蜡烛颜色偏好</label>
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
            入场通知
          </BaseCheckbox>
          <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.exitFill]">
            出场通知
          </BaseCheckbox>
          <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.entryCancel]">
            入场取消通知
          </BaseCheckbox>
          <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.exitCancel]">
            出场取消通知
          </BaseCheckbox>
        </div>
      </div>

      <div class="border rounded-sm border-neutral-400 p-4 space-y-4">
        <h4 class="text-lg font-semibold">回测设置</h4>
        <div>
          <label for="backtestMetrics" class="block">回测指标</label>
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
            >选择每对/每个标签应显示哪些指标。</small
          >
        </div>
      </div>
    </div>
  </UCard>
</template>
