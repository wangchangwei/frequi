<script setup lang="ts">
/**
 * Account List View
 * Phase 2: Exchange account registry - CRUD, balance display, exposure view
 */
import type { AccountRiskLevel, AccountType, ExchangeAccount } from '@/types/account';
import { useAccountStore } from '@/stores/account';

// Explicit import per Phase 2 requirements
const accountStore = useAccountStore();

// ==================== Dialog State ====================
const showAddDialog = ref(false);
const showEditDialog = ref(false);
const showExposureDialog = ref(false);
const showPassphraseDialog = ref(false);
const editingAccount = ref<ExchangeAccount | null>(null);
const viewingExposure = ref<ExchangeAccount | null>(null);

// ==================== Form State ====================
const passphraseForm = ref({ passphrase: '' });
const form = ref({
  name: '',
  exchange: '',
  type: 'spot' as AccountType,
  subtype: '',
  apiKey: '',
  apiSecret: '',
  password: '',
  extra: '',
  riskLevel: 'medium' as AccountRiskLevel,
  notes: '',
});

// ==================== Filters ====================
const searchQuery = ref('');
const riskFilter = ref<AccountRiskLevel | 'all'>('all');
const exchangeFilter = ref<string>('all');

const filteredAccounts = computed(() => {
  let result = accountStore.accounts;

  if (riskFilter.value !== 'all') {
    result = result.filter((a) => a.riskLevel === riskFilter.value);
  }

  if (exchangeFilter.value !== 'all') {
    result = result.filter((a) => a.exchange === exchangeFilter.value);
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.exchange.toLowerCase().includes(q) ||
        a.accountId.toLowerCase().includes(q),
    );
  }

  return result;
});

const uniqueExchanges = computed(() => {
  const set = new Set(accountStore.accounts.map((a) => a.exchange));
  return ['all', ...Array.from(set)];
});

const riskOptions = [
  { value: 'all', label: '全部' },
  { value: 'low', label: '低风险' },
  { value: 'medium', label: '中风险' },
  { value: 'high', label: '高风险' },
];

const riskLevelOptions = [
  { value: 'low', label: '低风险' },
  { value: 'medium', label: '中风险' },
  { value: 'high', label: '高风险' },
];

const accountTypeOptions = [
  { value: 'spot', label: '现货 (Spot)' },
  { value: 'margin', label: '杠杆 (Margin)' },
  { value: 'futures', label: '合约 (Futures)' },
  { value: 'funding', label: '理财 (Funding)' },
];

// Track whether setting passphrase was triggered by openAddDialog (for retry flow)
const pendingAddAfterPassphrase = ref(false);

function openPassphraseDialog() {
  passphraseForm.value.passphrase = '';
  showPassphraseDialog.value = true;
}

async function handleSetPassphrase() {
  if (!passphraseForm.value.passphrase.trim()) return;
  accountStore.setSessionPassphrase(passphraseForm.value.passphrase.trim());
  showPassphraseDialog.value = false;
  showAlert('会话密钥已设置，可添加/编辑账户');
  // If passphrase was set from openAddDialog, retry opening add dialog
  if (pendingAddAfterPassphrase.value) {
    pendingAddAfterPassphrase.value = false;
    resetForm();
    showAddDialog.value = true;
  }
}

function openAddDialog() {
  if (!accountStore.sessionPassphrase) {
    pendingAddAfterPassphrase.value = true;
    openPassphraseDialog();
    return;
  }
  pendingAddAfterPassphrase.value = false;
  resetForm();
  showAddDialog.value = true;
}

function openEditDialog(account: ExchangeAccount) {
  if (!accountStore.sessionPassphrase) {
    pendingAddAfterPassphrase.value = false; // edit doesn't retry
    openPassphraseDialog();
    return;
  }
  editingAccount.value = account;
  form.value = {
    name: account.name,
    exchange: account.exchange,
    type: account.type,
    subtype: account.subtype ?? '',
    apiKey: '',
    apiSecret: '',
    password: '',
    extra: '',
    riskLevel: account.riskLevel,
    notes: account.notes ?? '',
  };
  showEditDialog.value = true;
}

function openExposureDialog(account: ExchangeAccount) {
  viewingExposure.value = account;
  showExposureDialog.value = true;
}

function closeDialogs() {
  showAddDialog.value = false;
  showEditDialog.value = false;
  showExposureDialog.value = false;
  editingAccount.value = null;
  viewingExposure.value = null;
}

function resetForm() {
  form.value = {
    name: '',
    exchange: '',
    type: 'spot',
    subtype: '',
    apiKey: '',
    apiSecret: '',
    password: '',
    extra: '',
    riskLevel: 'medium',
    notes: '',
  };
}

function validateForm(): boolean {
  return !!(
    form.value.name.trim() &&
    form.value.exchange.trim() &&
    form.value.type &&
    form.value.riskLevel &&
    // For add, need credentials; for edit, credentials are optional
    (showAddDialog.value ? form.value.apiKey.trim() && form.value.apiSecret.trim() : true)
  );
}

async function handleAddAccount() {
  if (!validateForm()) return;

  try {
    await accountStore.addAccount({
      name: form.value.name.trim(),
      exchange: form.value.exchange.trim(),
      type: form.value.type,
      subtype: form.value.subtype.trim() || undefined,
      apiKey: form.value.apiKey.trim(),
      apiSecret: form.value.apiSecret.trim(),
      password: form.value.password.trim() || undefined,
      extra: form.value.extra.trim() || undefined,
      riskLevel: form.value.riskLevel,
      notes: form.value.notes.trim() || undefined,
    });
    showAlert(`账户 ${form.value.name} 已添加`);
    closeDialogs();
  } catch (err) {
    showAlert(`添加失败: ${err}`, 'error');
  }
}

async function handleUpdateAccount() {
  if (!editingAccount.value || !validateForm()) return;

  try {
    const hasNewCredentials = form.value.apiKey.trim() || form.value.apiSecret.trim();

    await accountStore.updateAccount(
      editingAccount.value.accountId,
      {
        name: form.value.name.trim(),
        exchange: form.value.exchange.trim(),
        type: form.value.type,
        subtype: form.value.subtype.trim() || undefined,
        riskLevel: form.value.riskLevel,
        notes: form.value.notes.trim() || undefined,
      },
      hasNewCredentials
        ? {
            apiKey: form.value.apiKey.trim() || undefined,
            apiSecret: form.value.apiSecret.trim() || undefined,
            password: form.value.password.trim() || undefined,
            extra: form.value.extra.trim() || undefined,
          }
        : undefined,
    );
    showAlert(`账户 ${form.value.name} 已更新`);
    closeDialogs();
  } catch (err) {
    showAlert(`更新失败: ${err}`, 'error');
  }
}

async function handleDeleteAccount(account: ExchangeAccount) {
  const { confirm } = useConfirmBox();
  if (
    await confirm({
      title: '删除确认',
      message: `确定要删除账户 ${account.name} (${account.accountId}) 吗？此操作不可恢复。`,
    })
  ) {
    accountStore.removeAccount(account.accountId);
    showAlert(`账户 ${account.name} 已删除`);
  }
}

// ==================== Helpers ====================

function getRiskColor(risk: AccountRiskLevel): 'success' | 'warning' | 'error' {
  switch (risk) {
    case 'low':
      return 'success';
    case 'medium':
      return 'warning';
    case 'high':
      return 'error';
    default:
      return 'warning';
  }
}

function getRiskLabel(risk: AccountRiskLevel): string {
  switch (risk) {
    case 'low':
      return '低风险';
    case 'medium':
      return '中风险';
    case 'high':
      return '高风险';
    default:
      return '未知';
  }
}

function getAccountTypeLabel(type: AccountType): string {
  switch (type) {
    case 'spot':
      return '现货';
    case 'margin':
      return '杠杆';
    case 'futures':
      return '合约';
    case 'funding':
      return '理财';
    default:
      return type;
  }
}

function formatBalance(account: ExchangeAccount): string {
  if (!account.balance) return '无数据';
  return `${account.balance.total.toFixed(4)} ${account.balance.stakeCurrency}`;
}

function formatExposure(account: ExchangeAccount): string {
  if (!account.exposure) return '无数据';
  return `${(account.exposure.totalExposureRatio * 100).toFixed(1)}%`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

// ==================== Mount ====================
onMounted(() => {
  showAddDialog.value = false;
  showEditDialog.value = false;
  showExposureDialog.value = false;
  showPassphraseDialog.value = false;
});
</script>

<template>
  <div class="p-4 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">账户管理</h1>
        <p class="text-sm text-neutral-500">
          共 {{ accountStore.accountCount }} 个账户
          <span v-if="accountStore.sessionPassphrase" class="text-green-500">
            · 会话密钥已设置</span
          >
          <span v-else class="text-yellow-500"> · 请先设置会话密钥</span>
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          v-if="!accountStore.sessionPassphrase"
          color="warning"
          icon="mdi-key"
          label="设置会话密钥"
          @click="openPassphraseDialog"
        />
        <UButton color="primary" icon="mdi-plus" label="添加账户" @click="openAddDialog" />
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-4 mb-6 items-center">
      <UInput v-model="searchQuery" placeholder="搜索账户..." icon="mdi-magnify" class="w-64" />
      <USelect
        v-model="riskFilter"
        :items="riskOptions"
        label-key="label"
        value-key="value"
        class="w-36"
      />
      <USelect
        v-if="uniqueExchanges.length > 2"
        v-model="exchangeFilter"
        :items="uniqueExchanges.map((e) => ({ value: e, label: e === 'all' ? '全部交易所' : e }))"
        label-key="label"
        value-key="value"
        class="w-40"
      />
    </div>

    <!-- Account List -->
    <div v-if="filteredAccounts.length > 0" class="grid gap-4">
      <UCard
        v-for="account in filteredAccounts"
        :key="account.accountId"
        class="hover:border-primary transition-colors"
      >
        <div class="flex items-center justify-between">
          <!-- Left: info -->
          <div class="flex items-center gap-4">
            <div class="flex flex-col">
              <span class="font-semibold text-lg">{{ account.name }}</span>
              <span class="text-sm text-neutral-500">{{ account.accountId }}</span>
            </div>
            <UBadge color="neutral" variant="outline">
              {{ account.exchange }}
            </UBadge>
            <UBadge :color="getRiskColor(account.riskLevel)" variant="soft">
              {{ getRiskLabel(account.riskLevel) }}
            </UBadge>
            <UBadge color="neutral" variant="subtle">
              {{ getAccountTypeLabel(account.type) }}
            </UBadge>
            <UBadge v-if="account.subtype" color="neutral" variant="outline">
              {{ account.subtype }}
            </UBadge>
          </div>

          <!-- Right: actions -->
          <div class="flex items-center gap-2">
            <UButton
              v-if="account.exposure"
              variant="soft"
              color="neutral"
              size="sm"
              icon="mdi-chart-bar"
              title="查看暴露"
              @click="openExposureDialog(account)"
            />
            <UButton
              variant="soft"
              color="neutral"
              size="sm"
              icon="mdi-pencil"
              title="编辑"
              @click="openEditDialog(account)"
            />
            <UButton
              variant="soft"
              color="error"
              size="sm"
              icon="mdi-delete"
              title="删除"
              @click="handleDeleteAccount(account)"
            />
          </div>
        </div>

        <!-- Account details row -->
        <div class="mt-3 flex gap-6 text-sm text-neutral-500">
          <span>余额: {{ formatBalance(account) }}</span>
          <span>暴露: {{ formatExposure(account) }}</span>
          <span>创建: {{ formatDate(account.createdAt) }}</span>
          <span v-if="account.notes" class="italic">备注: {{ account.notes }}</span>
        </div>
      </UCard>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-12 text-neutral-500">
      <i-mdi-bank-outline class="text-6xl mb-4" />
      <p class="text-lg">暂无账户</p>
      <p class="text-sm">点击上方 "添加账户" 开始注册您的第一个交易账户</p>
    </div>

    <!-- Passphrase Dialog -->
    <AppModal
      v-if="showPassphraseDialog"
      @close="showPassphraseDialog = false"
      title="设置会话密钥"
      size="md"
    >
      <div class="p-4">
        <UFormField>
          <template #label
            >加密密钥 (会话密钥) <span class="text-red-500 font-semibold">*</span></template
          >
          <UInput
            v-model="passphraseForm.passphrase"
            type="password"
            placeholder="输入用于加密账户凭据的密钥..."
          />
        </UFormField>
        <p class="mt-2 text-xs text-neutral-500">
          此密钥用于加密您的 API Key/Secret，请妥善保管。关闭浏览器后需重新输入。
        </p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            label="取消"
            @click="showPassphraseDialog = false"
          />
          <UButton color="primary" class="min-w-24" label="确认" @click="handleSetPassphrase" />
        </div>
      </template>
    </AppModal>

    <!-- Add Account Dialog -->
    <AppModal v-if="showAddDialog" @close="showAddDialog = false" title="添加账户" size="lg">
      <div class="p-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField>
            <template #label>账户名称 <span class="text-red-500 font-semibold">*</span></template>
            <UInput v-model="form.name" placeholder="我的主账户" />
          </UFormField>
          <UFormField>
            <template #label>交易所 <span class="text-red-500 font-semibold">*</span></template>
            <UInput v-model="form.exchange" placeholder="binance" />
          </UFormField>
        </div>
        <div class="grid grid-cols-2 gap-4 mt-4">
          <UFormField>
            <template #label>账户类型 <span class="text-red-500 font-semibold">*</span></template>
            <USelect
              v-model="form.type"
              :items="accountTypeOptions"
              label-key="label"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField label="子类型 (可选)">
            <UInput v-model="form.subtype" placeholder="usdt-m, coin-m..." />
          </UFormField>
        </div>
        <div class="mt-4">
          <h3 class="text-base font-semibold text-neutral-900 dark:text-neutral-100 mt-6 mb-3">
            API 凭据 (加密存储)
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <UFormField>
              <template #label>API Key <span class="text-red-500 font-semibold">*</span></template>
              <UInput v-model="form.apiKey" placeholder="您的 API Key" />
            </UFormField>
            <UFormField>
              <template #label
                >API Secret <span class="text-red-500 font-semibold">*</span></template
              >
              <UInput v-model="form.apiSecret" type="password" placeholder="您的 API Secret" />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <UFormField label="密码/验证码 (可选)">
              <UInput v-model="form.password" type="password" placeholder="可选" />
            </UFormField>
            <UFormField label="额外参数 (可选)">
              <UInput v-model="form.extra" placeholder="可选" />
            </UFormField>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4 mt-4">
          <UFormField>
            <template #label>风险等级 <span class="text-red-500 font-semibold">*</span></template>
            <USelect
              v-model="form.riskLevel"
              :items="riskLevelOptions"
              label-key="label"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </div>
        <div class="mt-4">
          <UFormField label="备注 (可选)">
            <UTextarea v-model="form.notes" :rows="2" placeholder="可选备注..." />
          </UFormField>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="取消" @click="closeDialogs" />
          <UButton color="primary" class="min-w-24" label="添加" @click="handleAddAccount" />
        </div>
      </template>
    </AppModal>

    <!-- Edit Account Dialog -->
    <AppModal v-if="showEditDialog" @close="showEditDialog = false" title="编辑账户" size="lg">
      <div class="p-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField>
            <template #label>账户名称 <span class="text-red-500 font-semibold">*</span></template>
            <UInput v-model="form.name" />
          </UFormField>
          <UFormField label="交易所">
            <UInput v-model="form.exchange" />
          </UFormField>
        </div>
        <div class="grid grid-cols-2 gap-4 mt-4">
          <UFormField label="账户类型">
            <USelect
              v-model="form.type"
              :items="accountTypeOptions"
              label-key="label"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField label="子类型 (可选)">
            <UInput v-model="form.subtype" />
          </UFormField>
        </div>
        <div class="mt-4">
          <h3 class="text-base font-semibold text-neutral-900 dark:text-neutral-100 mt-6 mb-3">
            更新 API 凭据
            <span class="text-neutral-500 font-normal">(留空则保持不变)</span>
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="新 API Key">
              <UInput v-model="form.apiKey" type="password" placeholder="留空保持不变" />
            </UFormField>
            <UFormField label="新 API Secret">
              <UInput v-model="form.apiSecret" type="password" placeholder="留空保持不变" />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <UFormField label="密码/验证码">
              <UInput v-model="form.password" type="password" placeholder="留空保持不变" />
            </UFormField>
            <UFormField label="额外参数">
              <UInput v-model="form.extra" placeholder="留空保持不变" />
            </UFormField>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4 mt-4">
          <UFormField>
            <template #label>风险等级 <span class="text-red-500 font-semibold">*</span></template>
            <USelect
              v-model="form.riskLevel"
              :items="riskLevelOptions"
              label-key="label"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </div>
        <div class="mt-4">
          <UFormField label="备注">
            <UTextarea v-model="form.notes" :rows="2" />
          </UFormField>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="取消" @click="closeDialogs" />
          <UButton color="primary" class="min-w-24" label="保存" @click="handleUpdateAccount" />
        </div>
      </template>
    </AppModal>

    <!-- Exposure Dialog -->
    <AppModal
      v-if="showExposureDialog && viewingExposure"
      @close="showExposureDialog = false"
      :title="`${viewingExposure.name} - 风险暴露`"
      size="lg"
    >
      <div class="p-4">
        <div class="grid grid-cols-3 gap-4">
          <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded">
            <div class="text-2xl font-bold">
              {{
                viewingExposure.exposure
                  ? `${(viewingExposure.exposure.totalExposureRatio * 100).toFixed(1)}%`
                  : 'N/A'
              }}
            </div>
            <div class="text-sm text-neutral-500">总暴露</div>
          </div>
          <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded">
            <div class="text-2xl font-bold">
              {{ viewingExposure.exposure ? viewingExposure.exposure.leverage.toFixed(1) : 'N/A' }}x
            </div>
            <div class="text-sm text-neutral-500">杠杆</div>
          </div>
          <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded">
            <div class="text-2xl font-bold">
              {{
                viewingExposure.exposure
                  ? `${(viewingExposure.exposure.longExposure * 100).toFixed(1)}%`
                  : 'N/A'
              }}
            </div>
            <div class="text-sm text-neutral-500">多头暴露</div>
          </div>
        </div>

        <div v-if="viewingExposure.exposure?.perPairExposure" class="mt-6">
          <h3 class="text-base font-semibold text-neutral-900 dark:text-neutral-100 mt-6 mb-3">
            按交易对暴露
          </h3>
          <div class="space-y-1">
            <div
              v-for="(ratio, pair) in viewingExposure.exposure.perPairExposure"
              :key="pair"
              class="flex justify-between text-sm"
            >
              <span>{{ pair }}</span>
              <span>{{ (ratio * 100).toFixed(2) }}%</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            color="neutral"
            variant="ghost"
            label="关闭"
            @click="showExposureDialog = false"
          />
        </div>
      </template>
    </AppModal>
  </div>
</template>
