<script setup lang="ts">
/**
 * Risk Dashboard View
 * Phase 4: Risk management center with rules, events, and exposure tracking
 */
import type { TableColumn } from '@nuxt/ui';
// @ts-expect-error UBadge, UToggle are globally registered via @nuxt/ui auto-import
import { UBadge, UToggle } from '@nuxt/ui';
import type { RiskRule, RiskEvent, RiskScope, RiskActionType } from '@/types/risk';
import { useRiskStore } from '@/stores/riskStore';

const riskStore = useRiskStore();

// ==================== Filter State ====================

const scopeFilter = ref<RiskScope | 'all'>('all');

const scopeOptions = [
  { value: 'all', label: '全部' },
  { value: 'bot', label: '机器人' },
  { value: 'account', label: '账户' },
  { value: 'coin', label: '币种' },
  { value: 'market', label: '市场' },
];

const filteredRules = computed(() => {
  if (scopeFilter.value === 'all') return riskStore.rules;
  return riskStore.rules.filter((r) => r.scope === scopeFilter.value);
});

// ==================== Summary Cards ====================

const activeRulesCount = computed(() => riskStore.enabledRules.length);
const activeEventsCount = computed(() => riskStore.activeEvents.length);
const triggeredTodayCount = computed(() => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return riskStore.events.filter((e) => e.triggeredAt >= todayStart.getTime()).length;
});
const exposedPositionsCount = computed(
  () => riskStore.exposures.filter((e) => e.exposurePct > 0.5).length,
);

// ==================== Dialog State ====================

const showAddDialog = ref(false);
const showEditDialog = ref(false);
const editingRule = ref<RiskRule | null>(null);

const form = ref({
  name: '',
  scope: 'bot' as RiskScope,
  scopeTarget: '',
  condition: '',
  threshold: 0,
  action: 'alert' as RiskActionType,
  actionTarget: '',
  enabled: true,
});

const scopeSelectOptions = [
  { value: 'bot', label: '机器人' },
  { value: 'account', label: '账户' },
  { value: 'coin', label: '币种' },
  { value: 'market', label: '市场' },
];

const actionSelectOptions = [
  { value: 'stopbuy', label: '停止买入 (Stop Buy)' },
  { value: 'pause', label: '暂停 (Pause)' },
  { value: 'force_exit', label: '强制平仓 (Force Exit)' },
  { value: 'blacklist', label: '黑名单 (Blacklist)' },
  { value: 'lock_pair', label: '锁定交易对 (Lock Pair)' },
  { value: 'restart', label: '重启 (Restart)' },
  { value: 'alert', label: '告警 (Alert)' },
];

function openAddDialog() {
  form.value = {
    name: '',
    scope: 'bot',
    scopeTarget: '',
    condition: '',
    threshold: 0,
    action: 'alert',
    actionTarget: '',
    enabled: true,
  };
  showAddDialog.value = true;
}

function openEditDialog(rule: RiskRule) {
  editingRule.value = rule;
  form.value = {
    name: rule.name,
    scope: rule.scope,
    scopeTarget: rule.scopeTarget ?? '',
    condition: rule.condition,
    threshold: rule.threshold,
    action: rule.action,
    actionTarget: rule.actionTarget ?? '',
    enabled: rule.enabled,
  };
  showEditDialog.value = true;
}

function closeDialog() {
  showAddDialog.value = false;
  showEditDialog.value = false;
  editingRule.value = null;
}

function handleCreateRule() {
  if (!form.value.name.trim()) return;

  riskStore.createRule({
    name: form.value.name.trim(),
    scope: form.value.scope,
    scopeTarget: form.value.scopeTarget || undefined,
    condition: form.value.condition,
    threshold: form.value.threshold,
    action: form.value.action,
    actionTarget: form.value.actionTarget || undefined,
  });

  showAlert(`规则 "${form.value.name}" 已创建`);
  closeDialog();
}

function handleUpdateRule() {
  if (!editingRule.value || !form.value.name.trim()) return;

  riskStore.updateRule(editingRule.value.id, {
    name: form.value.name.trim(),
    scope: form.value.scope,
    scopeTarget: form.value.scopeTarget || undefined,
    condition: form.value.condition,
    threshold: form.value.threshold,
    action: form.value.action,
    actionTarget: form.value.actionTarget || undefined,
    enabled: form.value.enabled,
  });

  showAlert(`规则 "${form.value.name}" 已更新`);
  closeDialog();
}

function handleDeleteRule(rule: RiskRule) {
  riskStore.deleteRule(rule.id);
  showAlert(`规则 "${rule.name}" 已删除`);
}

function handleToggleRule(rule: RiskRule) {
  riskStore.toggleRule(rule.id);
}

function handleResolveEvent(event: RiskEvent) {
  riskStore.resolveEvent(event.id);
  showAlert('事件已解决');
}

// ==================== Table Columns ====================

const ruleColumns: TableColumn<RiskRule>[] = [
  {
    accessorKey: 'name',
    header: '规则名称',
  },
  {
    accessorKey: 'scope',
    header: '作用域',
    cell: ({ row }) => {
      const scopeColors: Record<RiskScope, 'primary' | 'warning' | 'success' | 'error'> = {
        bot: 'primary',
        account: 'warning',
        coin: 'success',
        market: 'error',
      };
      const scopeLabels: Record<RiskScope, string> = {
        bot: '机器人',
        account: '账户',
        coin: '币种',
        market: '市场',
      };
      return h(
        UBadge,
        { color: scopeColors[row.original.scope] },
        () => scopeLabels[row.original.scope],
      );
    },
  },
  {
    accessorKey: 'condition',
    header: '条件',
  },
  {
    accessorKey: 'threshold',
    header: '阈值',
    cell: ({ row }) => row.original.threshold,
  },
  {
    accessorKey: 'action',
    header: '执行动作',
    cell: ({ row }) => {
      const actionLabels: Record<RiskActionType, string> = {
        stopbuy: '停止买入',
        pause: '暂停',
        force_exit: '强制平仓',
        blacklist: '黑名单',
        lock_pair: '锁定交易对',
        restart: '重启',
        alert: '告警',
      };
      return actionLabels[row.original.action] ?? row.original.action;
    },
  },
  {
    accessorKey: 'enabled',
    header: '启用',
    cell: ({ row }) =>
      h(UToggle, {
        modelValue: row.original.enabled,
        'onUpdate:modelValue': () => handleToggleRule(row.original),
      }),
  },
  {
    accessorKey: 'triggeredCount',
    header: '触发次数',
  },
];

const recentEvents = computed(() => riskStore.events.slice(0, 10));

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString();
}
</script>

<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">风险管理</h1>
      <UButton icon="i-mdi-plus" @click="openAddDialog">添加规则</UButton>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
        <div class="text-3xl font-bold text-primary">{{ activeRulesCount }}</div>
        <div class="text-sm text-neutral-500">活跃规则</div>
      </div>
      <div class="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
        <div class="text-3xl font-bold text-warning">{{ activeEventsCount }}</div>
        <div class="text-sm text-neutral-500">活跃事件</div>
      </div>
      <div class="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
        <div class="text-3xl font-bold text-info">{{ triggeredTodayCount }}</div>
        <div class="text-sm text-neutral-500">今日触发</div>
      </div>
      <div class="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
        <div class="text-3xl font-bold text-error">{{ exposedPositionsCount }}</div>
        <div class="text-sm text-neutral-500">暴露仓位</div>
      </div>
    </div>

    <!-- Risk Rules Section -->
    <div class="mb-8">
      <div class="flex items-center gap-4 mb-4">
        <h2 class="text-lg font-semibold">风险规则</h2>
        <UTabs v-model="scopeFilter" :items="scopeOptions" class="ml-auto" />
      </div>

      <UTable :data="filteredRules" :columns="ruleColumns">
        <template #empty-state>
          <div class="text-center py-8 text-neutral-500">
            <i-mdi-shield-outline class="text-5xl mb-3" />
            <p>暂无风险规则</p>
            <p class="text-sm">点击"添加规则"创建第一条规则</p>
          </div>
        </template>
        <template #body-row-actions="{ row }">
          <div class="flex gap-2">
            <UButton
              size="sm"
              variant="ghost"
              icon="i-mdi-pencil"
              @click="openEditDialog(row.original)"
            />
            <UButton
              size="sm"
              variant="ghost"
              color="error"
              icon="i-mdi-delete"
              @click="handleDeleteRule(row.original)"
            />
          </div>
        </template>
      </UTable>
    </div>

    <!-- Risk Events Section -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold mb-4">最近事件</h2>
      <div v-if="recentEvents.length === 0" class="text-center py-8 text-neutral-500">
        <i-mdi-timeline-alert class="text-5xl mb-3" />
        <p>暂无风险事件</p>
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="event in recentEvents"
          :key="event.id"
          class="flex items-center justify-between border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
          :class="{ 'opacity-50': event.resolved }"
        >
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <UBadge color="error">{{ event.ruleName }}</UBadge>
              <span class="text-sm text-neutral-500">{{ formatTime(event.triggeredAt) }}</span>
              <UBadge v-if="event.resolved" color="success">已解决</UBadge>
            </div>
            <div class="text-sm">
              <span class="font-medium">{{ event.scope }}</span>
              <span v-if="event.scopeTarget"> ({{ event.scopeTarget }})</span>
              <span class="mx-2">→</span>
              <span>{{ event.action }}</span>
            </div>
            <p class="text-sm text-neutral-500 mt-1">{{ event.details }}</p>
          </div>
          <UButton
            v-if="!event.resolved"
            size="sm"
            variant="outline"
            @click="handleResolveEvent(event)"
          >
            解决
          </UButton>
        </div>
      </div>
    </div>

    <!-- Exposure Meters Section -->
    <div v-if="riskStore.exposures.length > 0">
      <h2 class="text-lg font-semibold mb-4">仓位暴露</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="exposure in riskStore.exposures"
          :key="exposure.botId || exposure.accountId || exposure.coin || 'market'"
          class="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
        >
          <div class="flex justify-between mb-2">
            <span class="font-medium">
              {{
                exposure.botId
                  ? `Bot: ${exposure.botId}`
                  : exposure.accountId
                    ? `Account: ${exposure.accountId}`
                    : exposure.coin
                      ? `Coin: ${exposure.coin}`
                      : 'Market'
              }}
            </span>
            <span class="text-sm text-neutral-500">
              {{ (exposure.exposurePct * 100).toFixed(1) }}%
            </span>
          </div>
          <UProgress
            :value="exposure.exposurePct"
            :max="1"
            :color="
              exposure.exposurePct > 0.8
                ? 'error'
                : exposure.exposurePct > 0.5
                  ? 'warning'
                  : 'success'
            "
          />
          <div class="flex justify-between mt-2 text-xs text-neutral-500">
            <span>{{ exposure.currentExposure }}</span>
            <span>{{ exposure.maxExposure }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Rule Dialog -->
    <AppModal
      v-if="showAddDialog || showEditDialog"
      @close="closeDialog"
      :title="showEditDialog ? '编辑限制规则' : '添加限制规则'"
      size="lg"
    >
      <div class="p-4 space-y-4">
        <UFormField>
          <template #label>规则名称 <span class="text-red-500 font-semibold">*</span></template>
          <UInput v-model="form.name" placeholder="例如：日损失超过5%" required />
        </UFormField>

        <UFormField label="作用域">
          <USelect v-model="form.scope" :items="scopeSelectOptions" />
        </UFormField>

        <UFormField v-if="form.scope !== 'market'" label="目标">
          <UInput
            v-model="form.scopeTarget"
            :placeholder="
              form.scope === 'bot' ? 'bot_id' : form.scope === 'account' ? 'account_id' : 'BTC'
            "
          />
        </UFormField>

        <UFormField label="条件">
          <UTextarea v-model="form.condition" placeholder="例如：daily_loss > 5%" :rows="2" />
        </UFormField>

        <UFormField label="阈值">
          <UInput v-model.number="form.threshold" type="number" />
        </UFormField>

        <UFormField label="执行动作">
          <USelect v-model="form.action" :items="actionSelectOptions" />
        </UFormField>

        <UFormField
          v-if="form.action === 'blacklist' || form.action === 'lock_pair'"
          label="动作目标"
        >
          <UInput v-model="form.actionTarget" placeholder="例如：BTC/USDT" />
        </UFormField>

        <UFormField label="启用">
          <UToggle v-model="form.enabled" />
        </UFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" @click="closeDialog">取消</UButton>
          <UButton v-if="showEditDialog" @click="handleUpdateRule">更新</UButton>
          <UButton v-else @click="handleCreateRule">创建</UButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
