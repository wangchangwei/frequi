<script setup lang="ts">
/**
 * AI Analysis Center View
 * Phase 5: LLM-powered analysis of backtest results and trading performance
 */
import type { TableColumn } from '@nuxt/ui';
// @ts-expect-error UBadge, USelect are globally registered via @nuxt/ui auto-import
import { UBadge, USelect } from '@nuxt/ui';
import type { AiAnalysisRequest, AnalysisType } from '@/types/aiAnalysis';
import { useAiAnalysisStore } from '@/stores/aiAnalysisStore';

const aiAnalysisStore = useAiAnalysisStore();

// ==================== API Key Management ====================
const apiKeyInput = ref('');
const showApiKeySettings = ref(false);

const hasApiKey = computed(() => !!aiAnalysisStore.getApiKey());

onMounted(() => {
  aiAnalysisStore.fetchAvailableModels();
  const existingKey = aiAnalysisStore.getApiKey();
  if (existingKey) {
    apiKeyInput.value = existingKey;
  }
});

function saveApiKey() {
  if (apiKeyInput.value.trim()) {
    aiAnalysisStore.setApiKey(apiKeyInput.value.trim());
    showApiKeySettings.value = false;
    showAlert('API key saved successfully');
  }
}

function clearApiKey() {
  aiAnalysisStore.clearApiKey();
  apiKeyInput.value = '';
  showAlert('API key cleared');
}

// ==================== Analysis Launcher State ====================
const selectedType = ref<AnalysisType>('strategy');
const selectedTarget = ref<string>('');
const customPrompt = ref('');
const selectedModel = ref('gpt-4o-mini');
const showAdvanced = ref(false);
const isRunning = ref(false);

const analysisTypes: { value: AnalysisType; label: string }[] = [
  { value: 'strategy', label: '策略' },
  { value: 'trade', label: '交易' },
  { value: 'performance', label: '性能' },
  { value: 'risk', label: '风险' },
];

const modelOptions = computed(() =>
  aiAnalysisStore.availableModels.map((m) => ({
    value: m.id,
    label: `${m.name} (${m.provider})`,
  })),
);

// Fetch strategy list for strategy analysis
const botStore = useBotStore();
const strategyList = computed(() => botStore.activeBot?.strategyList || []);

const targetOptions = computed(() => {
  if (selectedType.value === 'strategy') {
    return strategyList.value.map((s) => ({ value: s, label: s }));
  }
  if (selectedType.value === 'trade') {
    // For trade analysis, we could show recent trades - for now just return empty
    return [];
  }
  return [];
});

// ==================== Run Analysis ====================
async function handleRunAnalysis() {
  if (!hasApiKey.value) {
    showApiKeySettings.value = true;
    showAlert('Please configure your API key first', 'warning');
    return;
  }

  const analysis = aiAnalysisStore.createAnalysis(
    selectedType.value,
    selectedTarget.value || undefined,
    selectedModel.value,
    customPrompt.value || undefined,
  );

  isRunning.value = true;

  try {
    await aiAnalysisStore.runAnalysis(analysis.id);
    showAlert('Analysis completed successfully');
  } catch (error) {
    showAlert(
      `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'error',
    );
  } finally {
    isRunning.value = false;
  }
}

function handleCancel() {
  aiAnalysisStore.cancelAnalysis();
  isRunning.value = false;
  showAlert('Analysis cancelled');
}

// ==================== Current Result ====================
const currentResult = computed(() => {
  if (aiAnalysisStore.activeAnalysis?.result) {
    return aiAnalysisStore.activeAnalysis.result;
  }
  // Get the most recent completed analysis
  const completed = aiAnalysisStore.analysisHistory.find((a) => a.status === 'completed');
  return completed?.result;
});

const currentAnalysis = computed(() => {
  if (aiAnalysisStore.activeAnalysis) {
    return aiAnalysisStore.activeAnalysis;
  }
  return aiAnalysisStore.analysisHistory.find((a) => a.status === 'completed');
});

// ==================== Score Badge Color ====================
function getScoreColor(score: number | undefined): 'success' | 'warning' | 'error' {
  if (score === undefined) return 'warning';
  if (score > 70) return 'success';
  if (score >= 40) return 'warning';
  return 'error';
}

function getScoreLabel(score: number | undefined): string {
  if (score === undefined) return 'N/A';
  if (score > 70) return '优秀';
  if (score >= 40) return '中等';
  return '需改进';
}

// ==================== Insight Category Colors ====================
function getInsightColor(category: string): 'success' | 'error' | 'info' | 'warning' {
  const colorMap: Record<string, 'success' | 'error' | 'info' | 'warning'> = {
    strength: 'success',
    weakness: 'error',
    observation: 'info',
    alert: 'warning',
  };
  return colorMap[category] || 'info';
}

function getInsightLabel(category: string): string {
  const labelMap: Record<string, string> = {
    strength: '优势',
    weakness: '劣势',
    observation: '观察',
    alert: '告警',
  };
  return labelMap[category] || category;
}

// ==================== History Table ====================
const historyColumns: TableColumn<AiAnalysisRequest>[] = [
  {
    accessorKey: 'type',
    header: '类型',
    cell: ({ row }) => {
      const typeLabels: Record<string, string> = {
        strategy: '策略',
        trade: '交易',
        performance: '性能',
        risk: '风险',
      };
      return typeLabels[row.original.type] || row.original.type;
    },
  },
  {
    accessorKey: 'targetId',
    header: '目标',
    cell: ({ row }) => row.original.targetId || '-',
  },
  {
    accessorKey: 'model',
    header: '模型',
  },
  {
    accessorKey: 'result.score',
    header: '评分',
    cell: ({ row }) => {
      const score = row.original.result?.score;
      return h(UBadge, { color: getScoreColor(score) }, () => score ?? 'N/A');
    },
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      const statusColors: Record<string, 'neutral' | 'info' | 'success' | 'error'> = {
        pending: 'neutral',
        running: 'info',
        completed: 'success',
        failed: 'error',
      };
      const statusLabels: Record<string, string> = {
        pending: '等待中',
        running: '运行中',
        completed: '已完成',
        failed: '失败',
      };
      return h(
        UBadge,
        { color: statusColors[row.original.status] || 'neutral' },
        () => statusLabels[row.original.status] || row.original.status,
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: '时间',
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return date.toLocaleString();
    },
  },
];

function viewAnalysis(analysis: AiAnalysisRequest) {
  // Set as active to view results
  aiAnalysisStore.activeAnalysis = analysis;
}

function deleteAnalysisFromHistory(analysis: AiAnalysisRequest) {
  aiAnalysisStore.deleteAnalysis(analysis.id);
  showAlert('Analysis deleted');
}

// ==================== Copy/Download ====================
function copyResults() {
  if (!currentResult.value) return;

  const text = `
Summary: ${currentResult.value.summary}
Score: ${currentResult.value.score ?? 'N/A'}
Tags: ${currentResult.value.tags?.join(', ') || 'None'}
Insights:
${currentResult.value.insights.map((i) => `- [${i.category}] ${i.text}`).join('\n')}
Recommendations:
${currentResult.value.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
  `.trim();

  navigator.clipboard.writeText(text);
  showAlert('Results copied to clipboard');
}

function downloadResults() {
  if (!currentResult.value || !currentAnalysis.value) return;

  const analysis = currentAnalysis.value;
  const result = currentResult.value;

  const report = {
    analysisType: analysis.type,
    targetId: analysis.targetId,
    model: analysis.model,
    timestamp: new Date(analysis.createdAt).toISOString(),
    summary: result.summary,
    score: result.score,
    tags: result.tags,
    insights: result.insights,
    recommendations: result.recommendations,
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analysis-${analysis.type}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showAlert('Results downloaded');
}
</script>

<template>
  <DraggableContainer header="AI 分析中心" class="px-4 py-2">
    <div class="space-y-6">
      <!-- API Key Settings Banner -->
      <div
        v-if="!hasApiKey"
        class="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <i-mdi-key-variant class="text-2xl text-warning" />
          <div>
            <p class="font-medium">API Key Required</p>
            <p class="text-sm text-neutral-500">
              Please configure your OpenAI API key to use AI analysis features.
            </p>
          </div>
        </div>
        <UButton color="warning" @click="showApiKeySettings = true"> Configure Key </UButton>
      </div>

      <!-- API Key Settings Panel -->
      <div v-if="showApiKeySettings" class="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold">API Key Configuration</h3>
          <UButton
            variant="ghost"
            size="sm"
            icon="i-mdi-close"
            @click="showApiKeySettings = false"
          />
        </div>
        <div class="space-y-4">
          <UFormField label="OpenAI API Key">
            <UInput
              v-model="apiKeyInput"
              type="password"
              placeholder="sk-..."
              class="w-full max-w-md"
            />
          </UFormField>
          <div class="flex gap-2">
            <UButton @click="saveApiKey" :disabled="!apiKeyInput.trim()"> Save Key </UButton>
            <UButton v-if="hasApiKey" variant="outline" color="error" @click="clearApiKey">
              Clear Key
            </UButton>
          </div>
          <p class="text-sm text-neutral-500">
            Your API key is stored locally in your browser and is only sent directly to OpenAI's
            API.
          </p>
        </div>
      </div>

      <!-- Model Selector in Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-sm text-neutral-500">Model:</span>
          <USelect v-model="selectedModel" :items="modelOptions" class="w-64" />
        </div>
        <UButton
          v-if="hasApiKey"
          variant="ghost"
          size="sm"
          icon="i-mdi-cog"
          @click="showApiKeySettings = !showApiKeySettings"
        >
          API Key Settings
        </UButton>
      </div>

      <!-- Analysis Launcher Panel -->
      <div class="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
        <h3 class="font-semibold mb-4">Start New Analysis</h3>

        <!-- Analysis Type Selector -->
        <div class="mb-4">
          <label class="text-sm text-neutral-500 mb-2 block">Analysis Type</label>
          <div class="flex gap-2">
            <UButton
              v-for="type in analysisTypes"
              :key="type.value"
              :color="selectedType === type.value ? 'primary' : 'neutral'"
              :variant="selectedType === type.value ? 'solid' : 'outline'"
              @click="selectedType = type.value"
            >
              {{ type.label }}
            </UButton>
          </div>
        </div>

        <!-- Target Selector (for strategy type) -->
        <div v-if="selectedType === 'strategy'" class="mb-4">
          <label class="text-sm text-neutral-500 mb-2 block">Target Strategy</label>
          <USelect
            v-model="selectedTarget"
            :items="targetOptions"
            placeholder="Select strategy (optional)"
            class="w-full max-w-sm"
          />
        </div>

        <!-- Advanced Options -->
        <div class="mb-4">
          <UButton
            variant="ghost"
            size="sm"
            :icon="showAdvanced ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'"
            @click="showAdvanced = !showAdvanced"
          >
            Advanced Options
          </UButton>

          <div v-if="showAdvanced" class="mt-4">
            <UFormField label="Custom Prompt">
              <UTextarea
                v-model="customPrompt"
                placeholder="Add additional context or specific questions for the analysis..."
                :rows="3"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <!-- Run Button -->
        <div class="flex gap-2">
          <UButton
            icon="i-mdi-brain"
            :loading="isRunning"
            :disabled="!hasApiKey || isRunning"
            @click="handleRunAnalysis"
          >
            {{ isRunning ? 'Analyzing...' : 'Analyze' }}
          </UButton>
          <UButton v-if="isRunning" variant="outline" color="error" @click="handleCancel">
            Cancel
          </UButton>
        </div>
      </div>

      <!-- Active Analysis Progress -->
      <div
        v-if="isRunning && aiAnalysisStore.activeAnalysis"
        class="bg-info/10 border border-info/30 rounded-lg p-4"
      >
        <div class="flex items-center gap-3 mb-3">
          <i-mdi-loading class="animate-spin text-info text-xl" />
          <span class="font-medium">Analysis in Progress</span>
        </div>
        <USkeleton :rows="3" />
        <p class="text-sm text-neutral-500 mt-3">
          Fetching {{ aiAnalysisStore.activeAnalysis.type }} data and consulting the AI model...
        </p>
      </div>

      <!-- Analysis Results Panel -->
      <div v-if="currentResult && currentAnalysis" class="space-y-4">
        <!-- Summary Card -->
        <div class="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold">Analysis Results</h3>
            <div class="flex items-center gap-2">
              <UBadge :color="getScoreColor(currentResult.score)" size="lg">
                Score: {{ currentResult.score ?? 'N/A' }}
              </UBadge>
              <span class="text-sm text-neutral-500">{{ getScoreLabel(currentResult.score) }}</span>
            </div>
          </div>

          <!-- Tags -->
          <div
            v-if="currentResult.tags && currentResult.tags.length > 0"
            class="flex gap-2 mb-4 flex-wrap"
          >
            <UBadge v-for="tag in currentResult.tags" :key="tag" variant="outline">
              {{ tag }}
            </UBadge>
          </div>

          <!-- Summary Text -->
          <div class="prose prose-sm dark:prose-invert max-w-none mb-4">
            <p class="whitespace-pre-wrap">{{ currentResult.summary }}</p>
          </div>

          <!-- Copy/Download Actions -->
          <div class="flex gap-2">
            <UButton variant="outline" size="sm" icon="i-mdi-content-copy" @click="copyResults">
              Copy
            </UButton>
            <UButton variant="outline" size="sm" icon="i-mdi-download" @click="downloadResults">
              Download
            </UButton>
          </div>
        </div>

        <!-- Insights List -->
        <div
          v-if="currentResult.insights.length > 0"
          class="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4"
        >
          <h4 class="font-semibold mb-3">Key Insights</h4>
          <div class="space-y-2">
            <div
              v-for="(insight, index) in currentResult.insights"
              :key="index"
              class="flex items-start gap-3 p-2 rounded"
            >
              <UBadge :color="getInsightColor(insight.category)" size="sm">
                {{ getInsightLabel(insight.category) }}
              </UBadge>
              <p class="text-sm flex-1">{{ insight.text }}</p>
            </div>
          </div>
        </div>

        <!-- Recommendations -->
        <div
          v-if="currentResult.recommendations.length > 0"
          class="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4"
        >
          <h4 class="font-semibold mb-3">Recommendations</h4>
          <ol class="list-decimal list-inside space-y-2">
            <li v-for="(rec, index) in currentResult.recommendations" :key="index" class="text-sm">
              {{ rec }}
            </li>
          </ol>
        </div>
      </div>

      <!-- No Results State -->
      <div
        v-if="!currentResult && !isRunning && aiAnalysisStore.analysisHistory.length === 0"
        class="text-center py-12 text-neutral-500"
      >
        <i-mdi-brain class="text-5xl mb-3 mx-auto" />
        <p class="text-lg mb-2">No analysis yet</p>
        <p class="text-sm">Configure your API key and run an analysis to see results here.</p>
      </div>

      <!-- History Table -->
      <div
        v-if="aiAnalysisStore.analysisHistory.length > 0"
        class="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold">Analysis History</h3>
          <UButton
            v-if="aiAnalysisStore.analysisHistory.length > 0"
            variant="ghost"
            size="sm"
            color="error"
            @click="aiAnalysisStore.clearHistory()"
          >
            Clear History
          </UButton>
        </div>

        <UTable :data="aiAnalysisStore.analysisHistory" :columns="historyColumns">
          <template #empty-state>
            <div class="text-center py-8 text-neutral-500">
              <p>No analysis history</p>
            </div>
          </template>
          <template #body-row-actions="{ row }">
            <div class="flex gap-2">
              <UButton
                v-if="row.original.status === 'completed'"
                size="sm"
                variant="ghost"
                icon="i-mdi-eye"
                @click="viewAnalysis(row.original)"
              />
              <UButton
                size="sm"
                variant="ghost"
                color="error"
                icon="i-mdi-delete"
                @click="deleteAnalysisFromHistory(row.original)"
              />
            </div>
          </template>
        </UTable>
      </div>
    </div>
  </DraggableContainer>
</template>
