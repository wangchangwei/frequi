import { defineStore } from 'pinia';
import type { BacktestJob, BacktestJobStatus, BacktestResult } from '@/types/backtestJob';
import { acceptHMRUpdate } from 'pinia';

export const useBacktestJobStore = defineStore(
  'backtestJob',
  () => {
    // State
    const jobs = ref<BacktestJob[]>([]);
    const results = ref<BacktestResult[]>([]);
    const selectedJobIds = ref<string[]>([]);

    // Actions
    function createJob(input: {
      name: string;
      strategyName: string;
      pairs: string[];
      timeframes: string[];
      timerange: string;
      configId?: string;
      accountId?: string;
    }): BacktestJob {
      const job: BacktestJob = {
        id: crypto.randomUUID(),
        name: input.name,
        strategyName: input.strategyName,
        configId: input.configId,
        accountId: input.accountId,
        pairs: input.pairs,
        timeframes: input.timeframes,
        timerange: input.timerange,
        status: 'queued',
      };
      jobs.value.push(job);
      return job;
    }

    function updateJobStatus(
      jobId: string,
      status: BacktestJobStatus,
      errorMessage?: string,
    ): void {
      const job = jobs.value.find((j) => j.id === jobId);
      if (!job) return;
      job.status = status;
      if (status === 'running' && !job.startedAt) {
        job.startedAt = Date.now();
      }
      if (status === 'completed' || status === 'failed') {
        job.completedAt = Date.now();
      }
      if (errorMessage) {
        job.errorMessage = errorMessage;
      }
    }

    function addResult(result: BacktestResult): void {
      results.value.unshift(result);
      // Link result to job
      const job = jobs.value.find((j) => j.id === result.jobId);
      if (job) {
        job.resultId = result.id;
        job.status = 'completed';
        job.completedAt = Date.now();
      }
    }

    function deleteJob(jobId: string): void {
      const job = jobs.value.find((j) => j.id === jobId);
      if (job?.resultId) {
        // Also delete associated result
        results.value = results.value.filter((r) => r.id !== job.resultId);
      }
      jobs.value = jobs.value.filter((j) => j.id !== jobId);
      selectedJobIds.value = selectedJobIds.value.filter((id) => id !== jobId);
    }

    function deleteResult(resultId: string): void {
      const result = results.value.find((r) => r.id === resultId);
      if (result) {
        // Unlink from job
        const job = jobs.value.find((j) => j.id === result.jobId);
        if (job) {
          job.resultId = undefined;
        }
      }
      results.value = results.value.filter((r) => r.id !== resultId);
      selectedJobIds.value = selectedJobIds.value.filter((id) => id !== resultId);
    }

    function toggleSelectJob(resultId: string): void {
      const idx = selectedJobIds.value.indexOf(resultId);
      if (idx >= 0) {
        selectedJobIds.value.splice(idx, 1);
      } else {
        selectedJobIds.value.push(resultId);
      }
    }

    function clearSelection(): void {
      selectedJobIds.value = [];
    }

    // Getters
    const runningJobs = computed(() => jobs.value.filter((j) => j.status === 'running'));
    const queuedJobs = computed(() => jobs.value.filter((j) => j.status === 'queued'));
    const completedJobs = computed(() => jobs.value.filter((j) => j.status === 'completed'));
    const selectedResults = computed(() =>
      results.value.filter((r) => selectedJobIds.value.includes(r.id)),
    );
    const getJobById = (id: string) => computed(() => jobs.value.find((j) => j.id === id));
    const getResultByJobId = (jobId: string) =>
      computed(() => results.value.find((r) => r.jobId === jobId));

    return {
      jobs,
      results,
      selectedJobIds,
      runningJobs,
      queuedJobs,
      completedJobs,
      selectedResults,
      createJob,
      updateJobStatus,
      addResult,
      deleteJob,
      deleteResult,
      toggleSelectJob,
      clearSelection,
      getJobById,
      getResultByJobId,
    };
  },
  {
    persist: {
      pick: ['jobs', 'results', 'selectedJobIds'],
    },
  },
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useBacktestJobStore, import.meta.hot));
}
