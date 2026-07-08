<script setup lang="ts">
/**
 * Config Center View
 * Phase 3: List and manage config templates
 */
import type { ConfigCategory, ConfigTemplate, ConfigTemplateInput } from '@/types/configTemplate';
import { useConfigStore } from '@/stores/configStore';
import type { TableColumn } from '@nuxt/ui';

const configStore = useConfigStore();
const router = useRouter();

// ==================== Filter State ====================

const categoryFilter = ref<ConfigCategory | 'all'>('all');
const searchQuery = ref('');

const categoryOptions = [
  { value: 'all', label: '全部' },
  { value: 'strategy-run', label: '策略运行' },
  { value: 'exchange', label: '交易所' },
  { value: 'pairlist', label: '交易对列表' },
  { value: 'risk', label: '风险管理' },
];

const categorySelectOptions = [
  { value: 'strategy-run', label: '策略运行' },
  { value: 'exchange', label: '交易所' },
  { value: 'pairlist', label: '交易对列表' },
  { value: 'risk', label: '风险管理' },
];

const categoryBadgeColor = (cat: ConfigCategory): 'success' | 'warning' | 'error' | 'primary' => {
  switch (cat) {
    case 'strategy-run':
      return 'primary';
    case 'exchange':
      return 'warning';
    case 'pairlist':
      return 'success';
    case 'risk':
      return 'error';
    default:
      return 'primary';
  }
};

const categoryLabel = (cat: ConfigCategory): string => {
  switch (cat) {
    case 'strategy-run':
      return '策略运行';
    case 'exchange':
      return '交易所';
    case 'pairlist':
      return '交易对列表';
    case 'risk':
      return '风险管理';
    default:
      return cat;
  }
};

const filteredTemplates = computed(() => {
  let result = configStore.templates;

  if (categoryFilter.value !== 'all') {
    result = result.filter((t) => t.category === categoryFilter.value);
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }

  return result;
});

// ==================== Dialog State ====================

const showAddDialog = ref(false);
const showEditDialog = ref(false);
const editingTemplate = ref<ConfigTemplate | null>(null);

type KVRow = { key: string; value: string };

function emptyKV(): KVRow[] {
  return [{ key: '', value: '' }];
}

function recordToKV(record: Record<string, any>): KVRow[] {
  if (!record || Object.keys(record).length === 0) return emptyKV();
  return Object.entries(record).map(([key, value]) => ({
    key,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
  }));
}

function kvToRecord(rows: KVRow[]): Record<string, any> {
  const result: Record<string, any> = {};
  rows.forEach((row) => {
    if (row.key.trim()) {
      // Try to parse value as JSON, fall back to raw string
      try {
        result[row.key.trim()] = JSON.parse(row.value);
      } catch {
        result[row.key.trim()] = row.value;
      }
    }
  });
  return result;
}

const form = ref({
  name: '',
  category: 'strategy-run' as ConfigCategory,
  description: '',
  parameters: emptyKV(),
  dryRunParams: emptyKV(),
  liveParams: emptyKV(),
  tags: '',
});

function openAddDialog() {
  resetForm();
  showAddDialog.value = true;
}

function openEditDialog(template: ConfigTemplate) {
  editingTemplate.value = template;
  form.value = {
    name: template.name,
    category: template.category,
    description: template.description ?? '',
    parameters: recordToKV(template.parameters),
    dryRunParams: recordToKV(template.dryRunParams),
    liveParams: recordToKV(template.liveParams),
    tags: template.tags.join(', '),
  };
  showEditDialog.value = true;
}

function closeDialogs() {
  showAddDialog.value = false;
  showEditDialog.value = false;
  editingTemplate.value = null;
}

function resetForm() {
  form.value = {
    name: '',
    category: 'strategy-run',
    description: '',
    parameters: emptyKV(),
    dryRunParams: emptyKV(),
    liveParams: emptyKV(),
    tags: '',
  };
}

function addKVField(field: 'parameters' | 'dryRunParams' | 'liveParams') {
  form.value[field].push({ key: '', value: '' });
}

function removeKVField(field: 'parameters' | 'dryRunParams' | 'liveParams', index: number) {
  form.value[field].splice(index, 1);
}

function validateForm(): boolean {
  return form.value.name.trim().length > 0;
}

function handleAddTemplate() {
  if (!validateForm()) return;

  const tags = form.value.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const input: ConfigTemplateInput = {
    name: form.value.name.trim(),
    category: form.value.category,
    description: form.value.description.trim() || undefined,
    parameters: kvToRecord(form.value.parameters),
    dryRunParams: kvToRecord(form.value.dryRunParams),
    liveParams: kvToRecord(form.value.liveParams),
    tags,
  };

  configStore.createTemplate(input);
  showAlert(`模板 ${form.value.name} 已创建`);
  closeDialogs();
}

function handleUpdateTemplate() {
  if (!editingTemplate.value || !validateForm()) return;

  const tags = form.value.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  configStore.updateTemplate(editingTemplate.value.id, {
    name: form.value.name.trim(),
    category: form.value.category,
    description: form.value.description.trim() || undefined,
    parameters: kvToRecord(form.value.parameters),
    dryRunParams: kvToRecord(form.value.dryRunParams),
    liveParams: kvToRecord(form.value.liveParams),
    tags,
  });

  showAlert(`模板 ${form.value.name} 已更新`);
  closeDialogs();
}

async function handleDeleteTemplate(template: ConfigTemplate) {
  const { confirm } = useConfirmBox();
  if (
    await confirm({
      title: '删除确认',
      message: `确定要删除模板 ${template.name} 吗？此操作不可恢复。`,
    })
  ) {
    configStore.deleteTemplate(template.id);
    showAlert(`模板 ${template.name} 已删除`);
  }
}

// ==================== Navigation ====================

function goToDetail(templateId: string) {
  router.push(`/configs/${templateId}`);
}

// ==================== Helpers ====================

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

// ==================== Table Columns ====================

type TemplateRow = ConfigTemplate;

const columns: TableColumn<TemplateRow>[] = [
  {
    accessorKey: 'name',
    header: '模板名称',
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name),
  },
  {
    accessorKey: 'category',
    header: '分类',
    cell: ({ row }) =>
      h('UBadge', { color: categoryBadgeColor(row.original.category), variant: 'soft' }, () =>
        categoryLabel(row.original.category),
      ),
  },
  {
    accessorKey: 'tags',
    header: '标签',
    cell: ({ row }) =>
      row.original.tags.length > 0
        ? h(
            'div',
            { class: 'flex gap-1 flex-wrap' },
            row.original.tags.map((tag) =>
              h('UBadge', { key: tag, color: 'primary', variant: 'subtle', size: 'xs' }, () => tag),
            ),
          )
        : h('span', { class: 'text-neutral-400 text-sm' }, '—'),
  },
  {
    accessorKey: 'versionCount',
    header: '版本数',
    cell: ({ row }) => {
      const count = configStore.getVersionsByTemplateId(row.original.id).length;
      return h('span', {}, count > 0 ? `v${count}` : '无版本');
    },
  },
  {
    accessorKey: 'latestVersion',
    header: '最新版本',
    cell: ({ row }) => {
      const latest = configStore.getLatestVersion(row.original.id);
      return latest
        ? h(
            'span',
            { class: 'text-sm text-neutral-600 dark:text-neutral-400' },
            `v${latest.version}`,
          )
        : h('span', { class: 'text-neutral-400 text-sm' }, '—');
    },
  },
  {
    accessorKey: 'isProduction',
    header: '生产',
    cell: ({ row }) => {
      const prod = configStore.getLatestProductionVersion(row.original.id);
      return prod
        ? h('UBadge', { color: 'success', variant: 'soft' }, () => `v${prod.version}`)
        : h('span', { class: 'text-neutral-400 text-sm' }, '—');
    },
  },
  {
    accessorKey: 'updatedAt',
    header: '更新时间',
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-neutral-500' }, formatDate(row.original.updatedAt)),
  },
  {
    accessorKey: 'actions',
    header: '操作',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-1' }, [
        h('UButton', {
          variant: 'soft',
          color: 'neutral',
          size: 'sm',
          icon: 'mdi-pencil',
          title: '编辑',
          onClick: (e: Event) => {
            e.stopPropagation();
            openEditDialog(row.original);
          },
        }),
        h('UButton', {
          variant: 'soft',
          color: 'primary',
          size: 'sm',
          icon: 'mdi-history',
          title: '版本历史',
          onClick: (e: Event) => {
            e.stopPropagation();
            goToDetail(row.original.id);
          },
        }),
        h('UButton', {
          variant: 'soft',
          color: 'error',
          size: 'sm',
          icon: 'mdi-delete',
          title: '删除',
          onClick: (e: Event) => {
            e.stopPropagation();
            handleDeleteTemplate(row.original);
          },
        }),
      ]),
  },
];

// ==================== Mount ====================

onMounted(() => {
  showAddDialog.value = false;
  showEditDialog.value = false;
});
</script>

<template>
  <div class="p-4 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">配置中心</h1>
        <p class="text-sm text-neutral-500">共 {{ configStore.templateCount }} 个配置模板</p>
      </div>
      <UButton color="primary" icon="mdi-plus" label="创建模板" @click="openAddDialog" />
    </div>

    <!-- Category Filter Tabs -->
    <div class="flex gap-2 mb-6 flex-wrap">
      <UButton
        v-for="opt in categoryOptions"
        :key="opt.value"
        :color="categoryFilter === opt.value ? 'primary' : 'neutral'"
        :variant="categoryFilter === opt.value ? 'solid' : 'outline'"
        size="sm"
        :label="opt.label"
        @click="categoryFilter = opt.value as any"
      />
    </div>

    <!-- Search -->
    <div class="mb-4">
      <UInput
        v-model="searchQuery"
        placeholder="搜索模板名称、描述或标签..."
        icon="mdi-magnify"
        class="w-80"
      />
    </div>

    <!-- Template Table -->
    <UTable
      :data="filteredTemplates"
      :columns="columns"
      class="w-full"
      @row-click="({ item }) => goToDetail(item.id)"
    />

    <!-- Empty state -->
    <div v-if="filteredTemplates.length === 0" class="text-center py-12 text-neutral-500">
      <i-mdi-cog class="text-6xl mb-4" />
      <p class="text-lg">暂无配置模板</p>
      <p class="text-sm">点击上方 "创建模板" 开始添加您的第一个配置模板</p>
    </div>

    <!-- Add Template Modal -->
    <AppModal v-if="showAddDialog" @close="showAddDialog = false" title="创建配置模板" size="xl">
      <div class="p-4 space-y-4">
        <!-- Name + Category -->
        <div class="grid grid-cols-2 gap-4">
          <UFormField>
            <template #label>模板名称 <span class="text-red-500 font-semibold">*</span></template>
            <UInput v-model="form.name" placeholder="趋势策略默认配置" />
          </UFormField>
          <UFormField>
            <template #label>分类 <span class="text-red-500 font-semibold">*</span></template>
            <USelect
              v-model="form.category"
              :items="categorySelectOptions"
              label-key="label"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Description -->
        <UFormField label="描述">
          <UTextarea v-model="form.description" :rows="2" placeholder="模板描述..." />
        </UFormField>

        <!-- Tags -->
        <UFormField label="标签 (逗号分隔)">
          <UInput v-model="form.tags" placeholder="趋势, 日内, 低风险" />
        </UFormField>

        <hr class="border-neutral-200 dark:border-neutral-700" />

        <!-- Key-Value Editors -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">参数 (key-value)</span>
            <UButton
              size="xs"
              variant="outline"
              icon="mdi-plus"
              @click="addKVField('parameters')"
            />
          </div>
          <div class="space-y-2">
            <div v-for="(row, idx) in form.parameters" :key="idx" class="flex gap-2 items-center">
              <UInput v-model="row.key" placeholder="参数名" class="flex-1" />
              <UInput v-model="row.value" placeholder="参数值" class="flex-1" />
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="mdi-close"
                @click="removeKVField('parameters', idx)"
              />
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">Dry-Run 参数</span>
            <UButton
              size="xs"
              variant="outline"
              icon="mdi-plus"
              @click="addKVField('dryRunParams')"
            />
          </div>
          <div class="space-y-2">
            <div v-for="(row, idx) in form.dryRunParams" :key="idx" class="flex gap-2 items-center">
              <UInput v-model="row.key" placeholder="参数名" class="flex-1" />
              <UInput v-model="row.value" placeholder="参数值" class="flex-1" />
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="mdi-close"
                @click="removeKVField('dryRunParams', idx)"
              />
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">Live 参数</span>
            <UButton
              size="xs"
              variant="outline"
              icon="mdi-plus"
              @click="addKVField('liveParams')"
            />
          </div>
          <div class="space-y-2">
            <div v-for="(row, idx) in form.liveParams" :key="idx" class="flex gap-2 items-center">
              <UInput v-model="row.key" placeholder="参数名" class="flex-1" />
              <UInput v-model="row.value" placeholder="参数值" class="flex-1" />
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="mdi-close"
                @click="removeKVField('liveParams', idx)"
              />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="取消" @click="closeDialogs" />
          <UButton color="primary" class="min-w-24" label="创建" @click="handleAddTemplate" />
        </div>
      </template>
    </AppModal>

    <!-- Edit Template Modal -->
    <AppModal v-if="showEditDialog" @close="showEditDialog = false" title="编辑配置模板" size="xl">
      <div class="p-4 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField>
            <template #label>模板名称 <span class="text-red-500 font-semibold">*</span></template>
            <UInput v-model="form.name" />
          </UFormField>
          <UFormField>
            <template #label>分类 <span class="text-red-500 font-semibold">*</span></template>
            <USelect
              v-model="form.category"
              :items="categorySelectOptions"
              label-key="label"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="描述">
          <UTextarea v-model="form.description" :rows="2" />
        </UFormField>

        <UFormField label="标签 (逗号分隔)">
          <UInput v-model="form.tags" />
        </UFormField>

        <hr class="border-neutral-200 dark:border-neutral-700" />

        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">参数 (key-value)</span>
            <UButton
              size="xs"
              variant="outline"
              icon="mdi-plus"
              @click="addKVField('parameters')"
            />
          </div>
          <div class="space-y-2">
            <div v-for="(row, idx) in form.parameters" :key="idx" class="flex gap-2 items-center">
              <UInput v-model="row.key" placeholder="参数名" class="flex-1" />
              <UInput v-model="row.value" placeholder="参数值" class="flex-1" />
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="mdi-close"
                @click="removeKVField('parameters', idx)"
              />
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">Dry-Run 参数</span>
            <UButton
              size="xs"
              variant="outline"
              icon="mdi-plus"
              @click="addKVField('dryRunParams')"
            />
          </div>
          <div class="space-y-2">
            <div v-for="(row, idx) in form.dryRunParams" :key="idx" class="flex gap-2 items-center">
              <UInput v-model="row.key" placeholder="参数名" class="flex-1" />
              <UInput v-model="row.value" placeholder="参数值" class="flex-1" />
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="mdi-close"
                @click="removeKVField('dryRunParams', idx)"
              />
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">Live 参数</span>
            <UButton
              size="xs"
              variant="outline"
              icon="mdi-plus"
              @click="addKVField('liveParams')"
            />
          </div>
          <div class="space-y-2">
            <div v-for="(row, idx) in form.liveParams" :key="idx" class="flex gap-2 items-center">
              <UInput v-model="row.key" placeholder="参数名" class="flex-1" />
              <UInput v-model="row.value" placeholder="参数值" class="flex-1" />
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="mdi-close"
                @click="removeKVField('liveParams', idx)"
              />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="取消" @click="closeDialogs" />
          <UButton color="primary" class="min-w-24" label="保存" @click="handleUpdateTemplate" />
        </div>
      </template>
    </AppModal>
  </div>
</template>
