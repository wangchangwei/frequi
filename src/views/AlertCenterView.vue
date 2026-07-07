<script setup lang="ts">
/**
 * Alert Center View
 * Phase 4: Alert rules management and alert history
 */
import type { TableColumn } from '@nuxt/ui';
// @ts-expect-error UBadge, UToggle are globally registered via @nuxt/ui auto-import
import { UBadge, UToggle } from '@nuxt/ui';
import type { AlertRule, AlertLevel, AlertChannel } from '@/stores/alertCenterStore';
import { useAlertCenterStore } from '@/stores/alertCenterStore';

const alertCenterStore = useAlertCenterStore();

// ==================== Dialog State ====================

const showAddDialog = ref(false);
const showEditDialog = ref(false);
const editingRule = ref<AlertRule | null>(null);

const form = ref({
  name: '',
  level: 'info' as AlertLevel,
  channel: 'in-app' as AlertChannel,
  target: '',
  enabled: true,
});

const levelOptions = [
  { value: 'info', label: '信息 (Info)' },
  { value: 'warning', label: '警告 (Warning)' },
  { value: 'critical', label: '严重 (Critical)' },
];

const channelOptions = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'email', label: 'Email' },
  { value: 'in-app', label: '应用内' },
];

function openAddDialog() {
  form.value = {
    name: '',
    level: 'info',
    channel: 'in-app',
    target: '',
    enabled: true,
  };
  showAddDialog.value = true;
}

function openEditDialog(rule: AlertRule) {
  editingRule.value = rule;
  form.value = {
    name: rule.name,
    level: rule.level,
    channel: rule.channel,
    target: rule.target,
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

  alertCenterStore.createRule({
    name: form.value.name.trim(),
    level: form.value.level,
    channel: form.value.channel,
    target: form.value.target,
  });

  showAlert(`规则 "${form.value.name}" 已创建`);
  closeDialog();
}

function handleUpdateRule() {
  if (!editingRule.value || !form.value.name.trim()) return;

  alertCenterStore.updateRule(editingRule.value.id, {
    name: form.value.name.trim(),
    level: form.value.level,
    channel: form.value.channel,
    target: form.value.target,
    enabled: form.value.enabled,
  });

  showAlert(`规则 "${form.value.name}" 已更新`);
  closeDialog();
}

function handleDeleteRule(rule: AlertRule) {
  alertCenterStore.deleteRule(rule.id);
  showAlert(`规则 "${rule.name}" 已删除`);
}

function handleToggleRule(rule: AlertRule) {
  alertCenterStore.toggleRule(rule.id);
}

// ==================== Table Columns ====================

const ruleColumns: TableColumn<AlertRule>[] = [
  {
    accessorKey: 'name',
    header: '规则名称',
  },
  {
    accessorKey: 'level',
    header: '级别',
    cell: ({ row }) => {
      const colorMap: Record<AlertLevel, 'neutral' | 'warning' | 'error'> = {
        info: 'neutral',
        warning: 'warning',
        critical: 'error',
      };
      const labelMap: Record<AlertLevel, string> = {
        info: '信息',
        warning: '警告',
        critical: '严重',
      };
      return h(UBadge, { color: colorMap[row.original.level] }, () => labelMap[row.original.level]);
    },
  },
  {
    accessorKey: 'channel',
    header: '频道',
    cell: ({ row }) => {
      const labelMap: Record<AlertChannel, string> = {
        telegram: 'Telegram',
        webhook: 'Webhook',
        email: 'Email',
        'in-app': '应用内',
      };
      return labelMap[row.original.channel] ?? row.original.channel;
    },
  },
  {
    accessorKey: 'target',
    header: '目标',
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
];

// ==================== Alert History ====================

const recentAlerts = computed(() => alertCenterStore.history.slice(0, 20));

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString();
}

function getLevelColor(level: AlertLevel): 'neutral' | 'warning' | 'error' {
  const colorMap: Record<AlertLevel, 'neutral' | 'warning' | 'error'> = {
    info: 'neutral',
    warning: 'warning',
    critical: 'error',
  };
  return colorMap[level];
}

function getLevelLabel(level: AlertLevel): string {
  const labelMap: Record<AlertLevel, string> = {
    info: '信息',
    warning: '警告',
    critical: '严重',
  };
  return labelMap[level];
}

// ==================== Quick Test ====================

const testChannel = ref<AlertChannel>('in-app');
const testMessage = ref('');

function handleSendTest() {
  if (!testMessage.value.trim()) return;

  alertCenterStore.sendTestAlert(testChannel.value, testMessage.value.trim());
  showAlert('测试告警已发送');
  testMessage.value = '';
}
</script>

<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">告警中心</h1>
      <UButton icon="i-mdi-plus" @click="openAddDialog">添加告警规则</UButton>
    </div>

    <!-- Alert Rules Section -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold mb-4">告警规则</h2>
      <UTable :data="alertCenterStore.rules" :columns="ruleColumns">
        <template #empty-state>
          <div class="text-center py-8 text-neutral-500">
            <i-mdi-bell-outline class="text-5xl mb-3" />
            <p>暂无告警规则</p>
            <p class="text-sm">点击"添加告警规则"创建第一条规则</p>
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

    <!-- Alert History Section -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">最近告警</h2>
        <UButton
          v-if="alertCenterStore.unreadCount > 0"
          size="sm"
          variant="outline"
          @click="alertCenterStore.markAllRead()"
        >
          全部已读 ({{ alertCenterStore.unreadCount }})
        </UButton>
      </div>
      <div v-if="recentAlerts.length === 0" class="text-center py-8 text-neutral-500">
        <i-mdi-bell-off-outline class="text-5xl mb-3" />
        <p>暂无告警记录</p>
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="alert in recentAlerts"
          :key="alert.id"
          class="flex items-center justify-between border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
          :class="{ 'opacity-50': alert.read }"
        >
          <div class="flex items-center gap-3 flex-1">
            <UBadge :color="getLevelColor(alert.level)">
              {{ getLevelLabel(alert.level) }}
            </UBadge>
            <div class="flex-1">
              <p class="font-medium">{{ alert.message }}</p>
              <div class="flex items-center gap-2 text-sm text-neutral-500 mt-1">
                <span>{{ formatTime(alert.timestamp) }}</span>
                <span>•</span>
                <span>{{ alert.channel }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              size="sm"
              variant="ghost"
              :icon="alert.read ? 'i-mdi-email-open' : 'i-mdi-email'"
              @click="alertCenterStore.toggleRead(alert.id)"
            />
            <UButton
              size="sm"
              variant="ghost"
              color="error"
              icon="i-mdi-delete"
              @click="alertCenterStore.deleteHistoryItem(alert.id)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Test Section -->
    <div>
      <h2 class="text-lg font-semibold mb-4">发送测试告警</h2>
      <div class="flex gap-4 items-end">
        <UFormField label="频道">
          <USelect v-model="testChannel" :items="channelOptions" class="w-40" />
        </UFormField>
        <UFormField label="消息" class="flex-1">
          <UInput v-model="testMessage" placeholder="输入测试消息..." />
        </UFormField>
        <UButton icon="i-mdi-send" @click="handleSendTest" :disabled="!testMessage.trim()">
          发送
        </UButton>
      </div>
    </div>

    <!-- Add/Edit Rule Dialog -->
    <UModal
      v-if="showAddDialog || showEditDialog"
      :open="showAddDialog || showEditDialog"
      @update:open="closeDialog"
      :title="showEditDialog ? '编辑规则' : '添加告警规则'"
      size="lg"
    >
      <div class="p-4 space-y-4">
        <UFormField label="规则名称" required>
          <UInput v-model="form.name" placeholder="例如：高损失告警" required />
        </UFormField>

        <UFormField label="级别">
          <USelect v-model="form.level" :items="levelOptions" />
        </UFormField>

        <UFormField label="频道">
          <USelect v-model="form.channel" :items="channelOptions" />
        </UFormField>

        <UFormField label="目标">
          <UInput v-model="form.target" placeholder="例如：@username 或 https://webhook.url" />
        </UFormField>

        <UFormField v-if="showEditDialog" label="启用">
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
    </UModal>
  </div>
</template>
