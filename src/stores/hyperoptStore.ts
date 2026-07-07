/**
 * Hyperopt Center Store
 * Phase 6: Hyperparameter optimization interface
 */
import { defineStore } from 'pinia';
import { acceptHMRUpdate } from 'pinia';
import type { HyperoptLossObj } from '@/types';
import type { HyperoptPayload, HyperoptResult } from '@/types/hyperopt';
import { availableSpaces } from '@/types/hyperopt';

export const useHyperoptStore = defineStore(
  'hyperopt',
  () => {
    // State
    const lossFunctions = ref<HyperoptLossObj[]>([]);
    const hyperoptResults = ref<HyperoptResult[]>([]);
    const activeHyperopt = ref<HyperoptResult | null>(null);
    const isRunning = ref(false);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    // Computed
    const completedResults = computed(() =>
      hyperoptResults.value.filter((r) => r.status === 'completed'),
    );

    // Actions
    async function fetchLossFunctions(): Promise<void> {
      const botStore = useBotStore();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (botStore as any).activeBot?.value?.api;
      if (!api) {
        error.value = 'No active bot';
        return;
      }
      isLoading.value = true;
      error.value = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await (api as any).get('/hyperopt-loss');
        lossFunctions.value = (res.data?.loss_functions || []) as HyperoptLossObj[];
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to fetch loss functions';
        console.error(err);
      } finally {
        isLoading.value = false;
      }
    }

    function startHyperopt(payload: HyperoptPayload): void {
      const id = crypto.randomUUID();
      const result: HyperoptResult = {
        id,
        strategy: payload.strategy,
        lossFunction: payload.loss_function,
        runs: 0,
        totalRuns: payload.epochs || 100,
        bestLoss: undefined,
        status: 'running',
        startTime: Date.now(),
        progress: 0,
      };
      hyperoptResults.value.unshift(result);
      activeHyperopt.value = result;
      isRunning.value = true;

      // Simulate progress for demonstration (actual hyperopt runs in separate worker)
      simulateHyperoptProgress(id);
    }

    function simulateHyperoptProgress(id: string): void {
      const interval = setInterval(() => {
        const result = hyperoptResults.value.find((r) => r.id === id);
        if (!result || result.status !== 'running') {
          clearInterval(interval);
          return;
        }
        result.runs += Math.floor(Math.random() * 5) + 1;
        if (result.runs >= result.totalRuns) {
          result.runs = result.totalRuns;
          result.progress = 100;
          result.status = 'completed';
          result.endTime = Date.now();
          result.bestLoss = Math.random() * 0.5 + 0.05; // mock best loss
          activeHyperopt.value = null;
          isRunning.value = false;
          clearInterval(interval);
        } else {
          result.progress = Math.round((result.runs / result.totalRuns) * 100);
          result.bestLoss = Math.random() * 0.5 + 0.05; // mock best loss
        }
      }, 2000);
    }

    function stopHyperopt(id: string): void {
      const result = hyperoptResults.value.find((r) => r.id === id);
      if (result && result.status === 'running') {
        result.status = 'stopped';
        result.endTime = Date.now();
        result.progress = Math.round((result.runs / result.totalRuns) * 100);
        if (activeHyperopt.value?.id === id) {
          activeHyperopt.value = null;
        }
        isRunning.value = false;
      }
    }

    function deleteHyperoptResult(id: string): void {
      hyperoptResults.value = hyperoptResults.value.filter((r) => r.id !== id);
      if (activeHyperopt.value?.id === id) {
        activeHyperopt.value = null;
        isRunning.value = false;
      }
    }

    function clearResults(): void {
      hyperoptResults.value = [];
      activeHyperopt.value = null;
      isRunning.value = false;
    }

    return {
      // State
      lossFunctions,
      availableSpaces,
      hyperoptResults,
      activeHyperopt,
      isRunning,
      isLoading,
      error,
      // Computed
      completedResults,
      // Actions
      fetchLossFunctions,
      startHyperopt,
      stopHyperopt,
      deleteHyperoptResult,
      clearResults,
    };
  },
  {
    persist: { pick: ['hyperoptResults'] },
  },
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useHyperoptStore, import.meta.hot));
}
