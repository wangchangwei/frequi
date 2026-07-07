<script setup lang="ts">
import type { GridItemData } from '@/types';
import { useBotRegistryStore } from '@/stores/botRegistry';
import { usePlatformStore } from '@/stores/platform';

const botStore = useBotStore();
const platformStore = usePlatformStore();
const botRegistryStore = useBotRegistryStore();

const layoutStore = useLayoutStore();
const currentBreakpoint = ref('');

function breakpointChanged(newBreakpoint: string) {
  // console.log('breakpoint:', newBreakpoint);
  currentBreakpoint.value = newBreakpoint;
}
const isResizableLayout = computed(() =>
  ['', 'sm', 'md', 'lg', 'xl'].includes(currentBreakpoint.value),
);
const isLayoutLocked = computed(() => {
  return layoutStore.layoutLocked || !isResizableLayout.value;
});

const gridLayoutData = computed((): GridItemData[] => {
  if (isResizableLayout.value) {
    return layoutStore.dashboardLayout;
  }
  return [...layoutStore.getDashboardLayoutSm];
});

function layoutUpdatedEvent(newLayout) {
  if (isResizableLayout.value) {
    console.log('newlayout', newLayout);
    console.log('saving dashboard');
    layoutStore.dashboardLayout = newLayout;
  }
}

const gridLayoutDaily = computed((): GridItemData => {
  return findGridLayout(gridLayoutData.value, DashboardLayout.dailyChart);
});

const gridLayoutBotComparison = computed((): GridItemData => {
  return findGridLayout(gridLayoutData.value, DashboardLayout.botComparison);
});

const gridLayoutAllOpenTrades = computed((): GridItemData => {
  return findGridLayout(gridLayoutData.value, DashboardLayout.allOpenTrades);
});
const gridLayoutAllClosedTrades = computed((): GridItemData => {
  return findGridLayout(gridLayoutData.value, DashboardLayout.allClosedTrades);
});

const gridLayoutCumChart = computed((): GridItemData => {
  return findGridLayout(gridLayoutData.value, DashboardLayout.cumChartChart);
});

const gridLayoutWalletHistory = computed((): GridItemData => {
  return findGridLayout(gridLayoutData.value, DashboardLayout.walletHistoryChart);
});

const gridLayoutProfitDistribution = computed((): GridItemData => {
  return findGridLayout(gridLayoutData.value, DashboardLayout.profitDistributionChart);
});
const gridLayoutTradesLogChart = computed((): GridItemData => {
  return findGridLayout(gridLayoutData.value, DashboardLayout.tradesLogChart);
});

const responsiveGridLayouts = computed(() => {
  return {
    sm: layoutStore.getDashboardLayoutSm,
  };
});

onMounted(async () => {
  botStore.allGetDaily({ timescale: 30 });
  // botStore.activeBot.getTrades();
  botStore.activeBot.getOpenTrades();
  botStore.activeBot.getProfit();
});
</script>

<template>
  <div>
    <!-- Platform Stats Banner -->
    <div
      v-if="botRegistryStore.botCount > 0"
      class="px-4 py-3 bg-primary-900/20 border-b border-primary/30"
    >
      <div class="max-w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
        <div>
          <div class="text-xs text-neutral-500">总权益</div>
          <div class="font-bold text-sm">{{ platformStore.totalEquity.toFixed(2) }}</div>
        </div>
        <div>
          <div class="text-xs text-neutral-500">今日收益</div>
          <div
            class="font-bold text-sm"
            :class="platformStore.todayProfit >= 0 ? 'text-green-500' : 'text-red-500'"
          >
            {{ platformStore.todayProfit >= 0 ? '+' : ''
            }}{{ platformStore.todayProfit.toFixed(2) }}
          </div>
        </div>
        <div>
          <div class="text-xs text-neutral-500">累计收益</div>
          <div
            class="font-bold text-sm"
            :class="platformStore.cumulativeProfit >= 0 ? 'text-green-500' : 'text-red-500'"
          >
            {{ platformStore.cumulativeProfit >= 0 ? '+' : ''
            }}{{ platformStore.cumulativeProfit.toFixed(2) }}
          </div>
        </div>
        <div>
          <div class="text-xs text-neutral-500">运行/停止</div>
          <div class="font-bold text-sm">
            {{ platformStore.runningBots }} / {{ platformStore.stoppedBots }}
          </div>
        </div>
        <div>
          <div class="text-xs text-neutral-500">在线机器人</div>
          <div class="font-bold text-sm text-green-500">{{ botRegistryStore.onlineCount }}</div>
        </div>
        <div>
          <div class="text-xs text-neutral-500">错误机器人</div>
          <div class="font-bold text-sm text-red-500">{{ platformStore.errorBots }}</div>
        </div>
        <div>
          <div class="text-xs text-neutral-500">未平仓位</div>
          <div class="font-bold text-sm">{{ platformStore.totalOpenPositions }}</div>
        </div>
        <div>
          <div class="text-xs text-neutral-500">今日交易</div>
          <div class="font-bold text-sm">{{ platformStore.todayTradeCount }}</div>
        </div>
      </div>
    </div>

    <GridLayout
      class="h-full w-full"
      style="padding: 1px"
      :row-height="50"
      :layout="gridLayoutData"
      :vertical-compact="false"
      :margin="[2, 2]"
      :responsive-layouts="responsiveGridLayouts"
      :is-resizable="!isLayoutLocked"
      :is-draggable="!isLayoutLocked"
      :responsive="true"
      :prevent-collision="true"
      :cols="{ lg: 12, md: 12, sm: 12, xs: 4, xxs: 2 }"
      :col-num="12"
      @layout-updated="layoutUpdatedEvent"
      @update:breakpoint="breakpointChanged"
    >
      <template #default="{ gridItemProps }">
        <GridItem
          v-bind="gridItemProps"
          :i="gridLayoutDaily.i"
          :x="gridLayoutDaily.x"
          :y="gridLayoutDaily.y"
          :w="gridLayoutDaily.w"
          :h="gridLayoutDaily.h"
          :min-w="3"
          :min-h="4"
          drag-allow-from=".drag-header"
        >
          <DraggableContainer
            :header="`Profit over time ${botStore.botCount > 1 ? 'combined' : ''}`"
          >
            <PeriodBreakdown multi-bot-view />
          </DraggableContainer>
        </GridItem>
        <GridItem
          v-bind="gridItemProps"
          :i="gridLayoutBotComparison.i"
          :x="gridLayoutBotComparison.x"
          :y="gridLayoutBotComparison.y"
          :w="gridLayoutBotComparison.w"
          :h="gridLayoutBotComparison.h"
          :min-w="3"
          :min-h="4"
          drag-allow-from=".drag-header"
        >
          <DraggableContainer header="机器人对比">
            <BotComparisonList />
          </DraggableContainer>
        </GridItem>
        <GridItem
          v-bind="gridItemProps"
          :i="gridLayoutAllOpenTrades.i"
          :x="gridLayoutAllOpenTrades.x"
          :y="gridLayoutAllOpenTrades.y"
          :w="gridLayoutAllOpenTrades.w"
          :h="gridLayoutAllOpenTrades.h"
          :min-w="3"
          :min-h="4"
          drag-allow-from=".drag-header"
        >
          <DraggableContainer
            header="未平仓位"
            info-text="Open trades of all selected bots. Click on a trade to go to the trade page for that trade/bot."
          >
            <TradeList active-trades :trades="botStore.allOpenTradesSelectedBots" multi-bot-view />
          </DraggableContainer>
        </GridItem>
        <GridItem
          v-bind="gridItemProps"
          :i="gridLayoutCumChart.i"
          :x="gridLayoutCumChart.x"
          :y="gridLayoutCumChart.y"
          :w="gridLayoutCumChart.w"
          :h="gridLayoutCumChart.h"
          :min-w="3"
          :min-h="4"
          drag-allow-from=".drag-header"
        >
          <DraggableContainer header="累计收益">
            <CumProfitChart
              :trades="botStore.allTradesSelectedBots"
              :open-trades="botStore.allOpenTradesSelectedBots"
              :show-title="false"
            />
          </DraggableContainer>
        </GridItem>
        <GridItem
          v-bind="gridItemProps"
          :i="gridLayoutWalletHistory.i"
          :x="gridLayoutWalletHistory.x"
          :y="gridLayoutWalletHistory.y"
          :w="gridLayoutWalletHistory.w"
          :h="gridLayoutWalletHistory.h"
          :min-w="3"
          :min-h="4"
          drag-allow-from=".drag-header"
        >
          <DraggableContainer header="钱包历史">
            <WalletHistoryChart :wallet-data="botStore.allBalanceHistory" :show-title="false" />
          </DraggableContainer>
        </GridItem>
        <GridItem
          v-bind="gridItemProps"
          :i="gridLayoutAllClosedTrades.i"
          :x="gridLayoutAllClosedTrades.x"
          :y="gridLayoutAllClosedTrades.y"
          :w="gridLayoutAllClosedTrades.w"
          :h="gridLayoutAllClosedTrades.h"
          :min-w="3"
          :min-h="4"
          drag-allow-from=".drag-header"
        >
          <DraggableContainer
            header="已平仓位"
            info-text="Closed trades for all selected bots. Click on a trade to go to the trade page for that trade/bot."
          >
            <TradeList
              :active-trades="false"
              show-filter
              :trades="botStore.allClosedTradesSelectedBots"
              multi-bot-view
            />
          </DraggableContainer>
        </GridItem>
        <GridItem
          v-bind="gridItemProps"
          :i="gridLayoutProfitDistribution.i"
          :x="gridLayoutProfitDistribution.x"
          :y="gridLayoutProfitDistribution.y"
          :w="gridLayoutProfitDistribution.w"
          :h="gridLayoutProfitDistribution.h"
          :min-w="3"
          :min-h="4"
          drag-allow-from=".drag-header"
        >
          <DraggableContainer header="Profit Distribution">
            <ProfitDistributionChart :trades="botStore.allTradesSelectedBots" :show-title="false" />
          </DraggableContainer>
        </GridItem>
        <GridItem
          v-bind="gridItemProps"
          :i="gridLayoutTradesLogChart.i"
          :x="gridLayoutTradesLogChart.x"
          :y="gridLayoutTradesLogChart.y"
          :w="gridLayoutTradesLogChart.w"
          :h="gridLayoutTradesLogChart.h"
          :min-w="3"
          :min-h="4"
          drag-allow-from=".drag-header"
        >
          <DraggableContainer header="Trades Log">
            <TradesLogChart :trades="botStore.allTradesSelectedBots" :show-title="false" />
          </DraggableContainer>
        </GridItem>
      </template>
    </GridLayout>
  </div>
</template>
