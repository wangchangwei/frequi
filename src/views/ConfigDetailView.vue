<script setup lang="ts">
/**
 * Config Detail View
 * Phase 3: Template details + version history timeline
 */
import type { ConfigVersion, ConfigVersionInput } from '@/types/configTemplate';
import { useConfigStore } from '@/stores/configStore';

const route = useRoute();
const router = useRouter();
const configStore = useConfigStore();

const templateId = computed(() => route.params.id as string);
const template = computed(() => configStore.getTemplateById(templateId.value));
const versions = computed(() => configStore.getVersionsByTemplateId(templateId.value));

// ==================== Version Form Dialog ====================

const showVersionDialog = ref(false);

type KVRow = { key: string; value: string };

function emptyKV(): KVRow[] {
  return [{ key: '', value: '' }];
}

function kvToRecord(rows: KVRow[]): Record<string, any> {
  const result: Record<string, any> = {};
  rows.forEach((row) => {
    if (row.key.trim()) {
      try {
        result[row.key.trim()] = JSON.parse(row.value);
      } catch {
        result[row.key.trim()] = row.value;
      }
    }
  });
  return result;
}

const versionForm = ref({
  content: emptyKV(),
  changelog: '',
  isProduction: false,
});

function openVersionDialog() {
  versionForm.value = {
    content: emptyKV(),
    changelog: '',
    isProduction: false,
  };
  showVersionDialog.value = true;
}

function closeVersionDialog() {
  showVersionDialog.value = false;
}

function addKVField() {
  versionForm.value.content.push({ key: '', value: '' });
}

function removeKVField(index: number) {
  versionForm.value.content.splice(index, 1);
}

function handleCreateVersion() {
  if (!template.value) return;

  const input: ConfigVersionInput = {
    content: kvToRecord(versionForm.value.content),
    changelog: versionForm.value.changelog.trim() || undefined,
    isProduction: versionForm.value.isProduction,
  };

  configStore.createVersion(template.value.id, input);
  showAlert('新版本已创建');
  closeVersionDialog();
}

// ==================== Version Actions ====================

async function handleRollback(version: ConfigVersion) {
  const { confirm } = useConfirmBox();
  if (
    await confirm({
      title: '回滚确认',
      message: `确定要回滚到版本 v${version.version} 吗？这将创建一个新的版本，内容与 v${version.version} 相同。`,
    })
  ) {
    const newVer = configStore.rollbackToVersion(templateId.value, version.id);
    if (newVer) {
      showAlert(`已回滚到 v${version.version}，新版本为 v${newVer.version}`);
    }
  }
}

function handleToggleLock(version: ConfigVersion) {
  if (version.isLocked) {
    configStore.unlockVersion(templateId.value, version.id);
    showAlert(`版本 v${version.version} 已解锁`);
  } else {
    configStore.lockVersion(templateId.value, version.id);
    showAlert(`版本 v${version.version} 已锁定`);
  }
}

function handleMarkProduction(version: ConfigVersion) {
  configStore.markProduction(templateId.value, version.id);
  showAlert(`版本 v${version.version} 已标记为生产版本`);
}

function goToDiff(versionId: string) {
  router.push(`/configs/${templateId.value}/diff?v1=${versionId}`);
}

function goBack() {
  router.push('/configs');
}

// ==================== Helpers ====================

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function getCategoryLabel(cat: string): string {
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
}

function getCategoryBadgeColor(cat: string): 'success' | 'warning' | 'error' | 'primary' {
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
}
</script>

<template>
  <div class="p-4 max-w-5xl mx-auto">
    <!-- Back button -->
    <div class="mb-4">
      <UButton variant="ghost" color="neutral" icon="mdi-arrow-left" label="返回" @click="goBack" />
    </div>

    <div v-if="!template" class="text-center py-12 text-neutral-500">
      <p class="text-lg">模板不存在</p>
    </div>

    <div v-else>
      <!-- Template Header -->
      <div class="mb-6">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-2xl font-bold">{{ template.name }}</h1>
            <div class="flex items-center gap-3 mt-2">
              <UBadge :color="getCategoryBadgeColor(template.category)" variant="soft">
                {{ getCategoryLabel(template.category) }}
              </UBadge>
              <UBadge
                v-for="tag in template.tags"
                :key="tag"
                color="primary"
                variant="subtle"
                size="sm"
              >
                {{ tag }}
              </UBadge>
            </div>
            <p v-if="template.description" class="mt-2 text-neutral-500">
              {{ template.description }}
            </p>
          </div>
          <UButton color="primary" icon="mdi-plus" label="创建新版本" @click="openVersionDialog" />
        </div>

        <div class="mt-4 flex gap-6 text-sm text-neutral-500">
          <span>创建时间: {{ formatDate(template.createdAt) }}</span>
          <span>更新时间: {{ formatDate(template.updatedAt) }}</span>
          <span>版本数: {{ versions.length }}</span>
        </div>
      </div>

      <!-- Template Parameters Summary -->
      <UCard class="mb-6">
        <template #header>
          <span class="font-medium">模板参数</span>
        </template>
        <div v-if="Object.keys(template.parameters).length > 0" class="space-y-1">
          <div v-for="(val, key) in template.parameters" :key="key" class="flex gap-2 text-sm">
            <span class="font-mono text-neutral-500">{{ key }}:</span>
            <span class="font-mono">{{ typeof val === 'object' ? JSON.stringify(val) : val }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-neutral-400">无默认参数</p>

        <hr class="my-4 border-neutral-200 dark:border-neutral-700" />

        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="text-xs font-medium text-neutral-500 uppercase">Dry-Run 参数</span>
            <div v-if="Object.keys(template.dryRunParams).length > 0" class="mt-1 space-y-1">
              <div
                v-for="(val, key) in template.dryRunParams"
                :key="key"
                class="flex gap-2 text-sm"
              >
                <span class="font-mono text-neutral-500">{{ key }}:</span>
                <span class="font-mono">{{
                  typeof val === 'object' ? JSON.stringify(val) : val
                }}</span>
              </div>
            </div>
            <p v-else class="mt-1 text-sm text-neutral-400">无</p>
          </div>
          <div>
            <span class="text-xs font-medium text-neutral-500 uppercase">Live 参数</span>
            <div v-if="Object.keys(template.liveParams).length > 0" class="mt-1 space-y-1">
              <div v-for="(val, key) in template.liveParams" :key="key" class="flex gap-2 text-sm">
                <span class="font-mono text-neutral-500">{{ key }}:</span>
                <span class="font-mono">{{
                  typeof val === 'object' ? JSON.stringify(val) : val
                }}</span>
              </div>
            </div>
            <p v-else class="mt-1 text-sm text-neutral-400">无</p>
          </div>
        </div>
      </UCard>

      <!-- Version History Timeline -->
      <div>
        <h2 class="text-lg font-semibold mb-4">版本历史</h2>

        <div v-if="versions.length === 0" class="text-center py-8 text-neutral-500">
          <p>暂无版本记录</p>
          <UButton class="mt-4" color="primary" label="创建第一个版本" @click="openVersionDialog" />
        </div>

        <div v-else class="relative">
          <!-- Timeline line -->
          <div class="absolute left-5 top-0 bottom-0 w-px bg-neutral-200 dark:bg-neutral-700" />

          <!-- Version entries -->
          <div class="space-y-4">
            <div
              v-for="version in [...versions].reverse()"
              :key="version.id"
              class="relative pl-12"
            >
              <!-- Timeline dot -->
              <div
                class="absolute left-3 w-5 h-5 rounded-full border-2 border-white dark:border-neutral-900"
                :class="
                  version.isProduction
                    ? 'bg-success'
                    : version.isLocked
                      ? 'bg-warning'
                      : 'bg-neutral-300 dark:bg-neutral-600'
                "
              />

              <UCard class="ml-2">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-3">
                    <span class="font-bold text-lg">v{{ version.version }}</span>
                    <UBadge v-if="version.isProduction" color="success" variant="soft" size="sm">
                      生产
                    </UBadge>
                    <UBadge v-if="version.isLocked" color="warning" variant="soft" size="sm">
                      锁定
                    </UBadge>
                    <span class="text-sm text-neutral-500">
                      {{ formatDate(version.createdAt) }} · {{ version.createdBy }}
                    </span>
                  </div>

                  <div class="flex items-center gap-1">
                    <!-- Compare button -->
                    <UButton
                      v-if="versions.length > 1"
                      variant="soft"
                      color="neutral"
                      size="xs"
                      icon="mdi-compare"
                      title="对比版本"
                      @click="goToDiff(version.id)"
                    />

                    <!-- Toggle lock -->
                    <UButton
                      variant="soft"
                      :color="version.isLocked ? 'warning' : 'neutral'"
                      size="xs"
                      :icon="version.isLocked ? 'mdi-lock' : 'mdi-lock-open'"
                      :title="version.isLocked ? '解锁' : '锁定'"
                      @click="handleToggleLock(version)"
                    />

                    <!-- Mark production -->
                    <UButton
                      v-if="!version.isProduction"
                      variant="soft"
                      color="success"
                      size="xs"
                      icon="mdi-check-circle"
                      title="标记为生产"
                      @click="handleMarkProduction(version)"
                    />

                    <!-- Rollback -->
                    <UButton
                      variant="soft"
                      color="primary"
                      size="xs"
                      icon="mdi-undo"
                      title="回滚到此版本"
                      @click="handleRollback(version)"
                    />
                  </div>
                </div>

                <!-- Changelog -->
                <div
                  v-if="version.changelog"
                  class="mt-2 text-sm text-neutral-600 dark:text-neutral-400"
                >
                  {{ version.changelog }}
                </div>

                <!-- Content preview -->
                <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div v-for="(val, key) in version.content" :key="key" class="flex gap-1">
                    <span class="font-mono text-neutral-500">{{ key }}:</span>
                    <span class="font-mono truncate">{{
                      typeof val === 'object' ? JSON.stringify(val) : val
                    }}</span>
                  </div>
                </div>
              </UCard>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Version Modal -->
    <AppModal
      v-if="showVersionDialog"
      @close="showVersionDialog = false"
      title="创建新版本"
      size="lg"
    >
      <div class="p-4 space-y-4">
        <UFormField label="版本内容 (key-value)">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-neutral-500">点击 + 添加参数行</span>
            <UButton size="xs" variant="outline" icon="mdi-plus" @click="addKVField" />
          </div>
          <div class="space-y-2">
            <div
              v-for="(row, idx) in versionForm.content"
              :key="idx"
              class="flex gap-2 items-center"
            >
              <UInput v-model="row.key" placeholder="参数名" class="flex-1" />
              <UInput v-model="row.value" placeholder="参数值" class="flex-1" />
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="mdi-close"
                @click="removeKVField(idx)"
              />
            </div>
          </div>
        </UFormField>

        <UFormField label="更新日志">
          <UTextarea v-model="versionForm.changelog" :rows="3" placeholder="描述此版本的变更..." />
        </UFormField>

        <div>
          <UCheckbox v-model="versionForm.isProduction" label="标记为生产版本" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="取消" @click="closeVersionDialog" />
          <UButton color="primary" label="创建版本" @click="handleCreateVersion" />
        </div>
      </template>
    </AppModal>
  </div>
</template>
