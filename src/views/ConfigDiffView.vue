<script setup lang="ts">
/**
 * Config Diff View
 * Phase 3: Side-by-side diff between two config versions
 */
import type { ConfigDiffLine } from '@/types/configTemplate';
import { useConfigStore } from '@/stores/configStore';
import { diffConfigs } from '@/utils/diff';

const route = useRoute();
const router = useRouter();
const configStore = useConfigStore();

const templateId = computed(() => route.params.id as string);
const template = computed(() => configStore.getTemplateById(templateId.value));
const versions = computed(() => configStore.getVersionsByTemplateId(templateId.value));

// Selected version IDs from query params
const v1Id = computed(() => (route.query.v1 as string) ?? '');
const v2Id = computed(() => (route.query.v2 as string) ?? '');

const v1Version = computed(() => versions.value.find((v) => v.id === v1Id.value));
const v2Version = computed(() => versions.value.find((v) => v.id === v2Id.value));

// Diff result
const diffLines = computed<ConfigDiffLine[]>(() => {
  if (!v1Version.value || !v2Version.value) return [];
  return diffConfigs(v1Version.value.content, v2Version.value.content);
});

// When only one version is selected, compare against empty
const diffLinesV1Only = computed<ConfigDiffLine[]>(() => {
  if (v1Version.value && !v2Version.value) {
    return diffConfigs(v1Version.value.content, {});
  }
  return [];
});

// Group diff lines by type for display
const addedLines = computed(() => diffLines.value.filter((l) => l.type === 'added'));
const removedLines = computed(() => diffLines.value.filter((l) => l.type === 'removed'));
const changedLines = computed(() => diffLines.value.filter((l) => l.type === 'changed'));

// Version selector options
const versionOptions = computed(() =>
  versions.value.map((v) => ({
    value: v.id,
    label: `v${v.version}${v.isProduction ? ' ★' : ''}${v.isLocked ? ' 🔒' : ''}`,
  })),
);

function selectV1(id: string) {
  router.replace({ query: { ...route.query, v1: id } });
}

function selectV2(id: string) {
  router.replace({ query: { ...route.query, v2: id } });
}

function goBack() {
  router.push(`/configs/${templateId.value}`);
}

function getDiffClass(type: 'added' | 'removed' | 'changed'): string {
  switch (type) {
    case 'added':
      return 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300';
    case 'removed':
      return 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300';
    case 'changed':
      return 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300';
    default:
      return '';
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

// If only v1 selected (no v2), show single column diff
const singleMode = computed(() => v1Version.value && !v2Version.value);
const doubleMode = computed(() => v1Version.value && v2Version.value);
</script>

<template>
  <div class="p-4 max-w-6xl mx-auto">
    <!-- Back button -->
    <div class="mb-4">
      <UButton variant="ghost" color="neutral" icon="mdi-arrow-left" label="返回" @click="goBack" />
    </div>

    <div v-if="!template" class="text-center py-12 text-neutral-500">
      <p class="text-lg">模板不存在</p>
    </div>

    <div v-else>
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold">配置对比</h1>
        <p class="text-sm text-neutral-500 mt-1">{{ template.name }}</p>
      </div>

      <!-- Version Selectors -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <UCard>
          <template #header>
            <span class="text-sm font-medium">选择版本 A (左侧)</span>
          </template>
          <USelect
            :model-value="v1Id"
            :items="versionOptions"
            label-key="label"
            value-key="value"
            placeholder="选择版本"
            class="w-full"
            @update:model-value="selectV1"
          />
          <div v-if="v1Version" class="mt-2 text-xs text-neutral-500">
            v{{ v1Version.version }} · {{ formatDate(v1Version.createdAt) }}
            <UBadge
              v-if="v1Version.isProduction"
              color="success"
              variant="soft"
              size="xs"
              class="ms-1"
            >
              生产
            </UBadge>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <span class="text-sm font-medium">选择版本 B (右侧)</span>
          </template>
          <USelect
            :model-value="v2Id"
            :items="versionOptions"
            label-key="label"
            value-key="value"
            placeholder="选择版本"
            class="w-full"
            @update:model-value="selectV2"
          />
          <div v-if="v2Version" class="mt-2 text-xs text-neutral-500">
            v{{ v2Version.version }} · {{ formatDate(v2Version.createdAt) }}
            <UBadge
              v-if="v2Version.isProduction"
              color="success"
              variant="soft"
              size="xs"
              class="ms-1"
            >
              生产
            </UBadge>
          </div>
        </UCard>
      </div>

      <!-- Empty state: no selections -->
      <div v-if="!v1Version && !v2Version" class="text-center py-16 text-neutral-500">
        <i-mdi-compare class="text-6xl mb-4" />
        <p class="text-lg">请选择要对比的版本</p>
        <p class="text-sm">上方下拉菜单选择两个版本进行对比</p>
      </div>

      <!-- Single version selected (v1 only) -->
      <div v-else-if="singleMode">
        <div class="mb-4">
          <UBadge color="primary" variant="soft">
            仅选择了 v{{ v1Version!.version }} — 显示与空配置的差异
          </UBadge>
        </div>

        <UCard>
          <template #header>
            <span class="font-medium">新增项目 (v{{ v1Version!.version }} 独有)</span>
          </template>
          <div v-if="diffLinesV1Only.length > 0" class="space-y-1">
            <div
              v-for="line in diffLinesV1Only"
              :key="line.key"
              class="flex items-start gap-3 px-3 py-2 rounded text-sm"
              :class="getDiffClass('added')"
            >
              <UBadge color="success" variant="soft" size="xs" class="mt-0.5">新增</UBadge>
              <span class="font-mono font-medium">{{ line.key }}</span>
              <span class="font-mono text-neutral-500">=</span>
              <span class="font-mono">{{
                typeof line.newValue === 'object' ? JSON.stringify(line.newValue) : line.newValue
              }}</span>
            </div>
          </div>
          <p v-else class="text-sm text-neutral-400 px-3">无新增项目</p>
        </UCard>
      </div>

      <!-- Both versions selected: side-by-side diff -->
      <div v-else-if="doubleMode">
        <!-- Summary badges -->
        <div class="flex gap-2 mb-4 flex-wrap">
          <UBadge v-if="addedLines.length > 0" color="success" variant="soft">
            +{{ addedLines.length }} 新增
          </UBadge>
          <UBadge v-if="removedLines.length > 0" color="error" variant="soft">
            -{{ removedLines.length }} 删除
          </UBadge>
          <UBadge v-if="changedLines.length > 0" color="warning" variant="soft">
            ~{{ changedLines.length }} 变更
          </UBadge>
          <UBadge v-if="diffLines.length === 0" color="neutral" variant="soft"> 无差异 </UBadge>
        </div>

        <!-- Changed -->
        <UCard v-if="changedLines.length > 0" class="mb-4">
          <template #header>
            <span class="font-medium">变更</span>
          </template>
          <div class="space-y-2">
            <div
              v-for="line in changedLines"
              :key="line.key"
              class="grid grid-cols-2 gap-4 px-3 py-2 rounded text-sm"
              :class="getDiffClass('changed')"
            >
              <div class="flex items-center gap-2">
                <UBadge color="warning" variant="soft" size="xs">变更</UBadge>
                <span class="font-mono font-medium">{{ line.key }}</span>
              </div>
              <div class="flex items-center gap-2 overflow-hidden">
                <span
                  class="font-mono text-red-600 dark:text-red-400 line-through text-xs truncate"
                >
                  {{
                    typeof line.oldValue === 'object'
                      ? JSON.stringify(line.oldValue)
                      : line.oldValue
                  }}
                </span>
                <span class="text-neutral-400">→</span>
                <span class="font-mono text-green-600 dark:text-green-400 text-xs truncate">
                  {{
                    typeof line.newValue === 'object'
                      ? JSON.stringify(line.newValue)
                      : line.newValue
                  }}
                </span>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Added -->
        <UCard v-if="addedLines.length > 0" class="mb-4">
          <template #header>
            <span class="font-medium">新增 (仅 B 有)</span>
          </template>
          <div class="space-y-1">
            <div
              v-for="line in addedLines"
              :key="line.key"
              class="flex items-start gap-3 px-3 py-2 rounded text-sm"
              :class="getDiffClass('added')"
            >
              <UBadge color="success" variant="soft" size="xs">新增</UBadge>
              <span class="font-mono font-medium">{{ line.key }}</span>
              <span class="font-mono text-neutral-500">=</span>
              <span class="font-mono">{{
                typeof line.newValue === 'object' ? JSON.stringify(line.newValue) : line.newValue
              }}</span>
            </div>
          </div>
        </UCard>

        <!-- Removed -->
        <UCard v-if="removedLines.length > 0" class="mb-4">
          <template #header>
            <span class="font-medium">删除 (仅 A 有)</span>
          </template>
          <div class="space-y-1">
            <div
              v-for="line in removedLines"
              :key="line.key"
              class="flex items-start gap-3 px-3 py-2 rounded text-sm"
              :class="getDiffClass('removed')"
            >
              <UBadge color="error" variant="soft" size="xs">删除</UBadge>
              <span class="font-mono font-medium">{{ line.key }}</span>
              <span class="font-mono text-neutral-500">=</span>
              <span class="font-mono line-through">{{
                typeof line.oldValue === 'object' ? JSON.stringify(line.oldValue) : line.oldValue
              }}</span>
            </div>
          </div>
        </UCard>

        <!-- Full content for both versions side by side -->
        <div class="grid grid-cols-2 gap-4">
          <UCard>
            <template #header>
              <span class="font-medium">v{{ v1Version!.version }} 完整内容</span>
            </template>
            <div v-if="Object.keys(v1Version!.content).length > 0" class="space-y-1">
              <div
                v-for="(val, key) in v1Version!.content"
                :key="key"
                class="flex gap-2 text-sm font-mono"
              >
                <span class="text-neutral-500">{{ key }}:</span>
                <span>{{ typeof val === 'object' ? JSON.stringify(val) : val }}</span>
              </div>
            </div>
            <p v-else class="text-sm text-neutral-400">空</p>
          </UCard>

          <UCard>
            <template #header>
              <span class="font-medium">v{{ v2Version!.version }} 完整内容</span>
            </template>
            <div v-if="Object.keys(v2Version!.content).length > 0" class="space-y-1">
              <div
                v-for="(val, key) in v2Version!.content"
                :key="key"
                class="flex gap-2 text-sm font-mono"
              >
                <span class="text-neutral-500">{{ key }}:</span>
                <span>{{ typeof val === 'object' ? JSON.stringify(val) : val }}</span>
              </div>
            </div>
            <p v-else class="text-sm text-neutral-400">空</p>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>
