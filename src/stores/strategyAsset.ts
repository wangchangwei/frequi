/**
 * Strategy Asset Store
 * Phase 2: Strategy registry with version history and risk tracking
 */
import type {
  AddVersionInput,
  CreateStrategyInput,
  StrategyAsset,
  StrategyBacktestLink,
  StrategyBotLink,
  StrategyRiskLevel,
  StrategyVersion,
  UpdateStrategyInput,
} from '@/types/strategyAsset';

export const useStrategyStore = defineStore(
  'strategyAsset',
  () => {
    // ==================== State ====================

    const strategies = ref<StrategyAsset[]>([]);

    // ==================== Computed ====================

    const strategyMap = computed<Record<string, StrategyAsset>>(() => {
      const map: Record<string, StrategyAsset> = {};
      strategies.value.forEach((s) => {
        map[s.strategyId] = s;
      });
      return map;
    });

    const strategyCount = computed(() => strategies.value.length);

    const strategiesByRiskLevel = computed<Record<StrategyRiskLevel, StrategyAsset[]>>(() => ({
      low: strategies.value.filter((s) => s.riskLevel === 'low'),
      medium: strategies.value.filter((s) => s.riskLevel === 'medium'),
      high: strategies.value.filter((s) => s.riskLevel === 'high'),
      extreme: strategies.value.filter((s) => s.riskLevel === 'extreme'),
    }));

    const strategiesByTag = computed<Record<string, StrategyAsset[]>>(() => {
      const result: Record<string, StrategyAsset[]> = {};
      strategies.value.forEach((s) => {
        s.tags.forEach((tag) => {
          if (!result[tag]) {
            result[tag] = [];
          }
          result[tag].push(s);
        });
      });
      return result;
    });

    // ==================== CRUD Actions ====================

    function addStrategy(input: CreateStrategyInput): StrategyAsset {
      const now = Date.now();
      const strategyId = `strat_${now}`;

      const version: StrategyVersion = {
        ...input.initialVersion,
        filePath: input.initialVersion.filePath ?? '',
        isActive: true,
        createdAt: now,
      };

      const strategy: StrategyAsset = {
        strategyId,
        name: input.name,
        strategyName: input.strategyName,
        versions: [version],
        currentVersionId: version.versionId,
        riskLevel: input.riskLevel ?? 'medium',
        currentFileHash: version.fileHash,
        description: input.description,
        tags: input.tags ?? [],
        linkedBots: [],
        linkedBacktests: [],
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      };

      strategies.value.push(strategy);
      return strategy;
    }

    function updateStrategy(strategyId: string, updates: UpdateStrategyInput): void {
      const index = strategies.value.findIndex((s) => s.strategyId === strategyId);
      if (index === -1) {
        throw new Error(`Strategy ${strategyId} not found`);
      }

      const existing = strategies.value[index];

      // If updating currentVersionId, update currentFileHash accordingly
      let currentFileHash = updates.currentFileHash ?? existing.currentFileHash;
      if (updates.currentVersionId && updates.currentVersionId !== existing.currentVersionId) {
        const newVersion = existing.versions.find((v) => v.versionId === updates.currentVersionId);
        if (newVersion) {
          currentFileHash = newVersion.fileHash;
          // Deactivate all other versions
          existing.versions.forEach((v) => {
            v.isActive = v.versionId === updates.currentVersionId;
          });
        }
      }

      strategies.value[index] = {
        ...existing,
        ...updates,
        currentFileHash,
        updatedAt: Date.now(),
      };
    }

    function removeStrategy(strategyId: string): void {
      const index = strategies.value.findIndex((s) => s.strategyId === strategyId);
      if (index !== -1) {
        strategies.value.splice(index, 1);
      }
    }

    function getStrategy(strategyId: string): StrategyAsset | undefined {
      return strategyMap.value[strategyId];
    }

    // ==================== Version Management ====================

    function addVersion(strategyId: string, versionInput: AddVersionInput): StrategyVersion {
      const index = strategies.value.findIndex((s) => s.strategyId === strategyId);
      if (index === -1) {
        throw new Error(`Strategy ${strategyId} not found`);
      }

      const strategy = strategies.value[index];
      const now = Date.now();

      const version: StrategyVersion = {
        versionId: versionInput.versionId,
        strategyName: versionInput.strategyName,
        fileHash: versionInput.fileHash,
        filePath: versionInput.filePath,
        parameters: versionInput.parameters,
        changelog: versionInput.changelog,
        isActive: true,
        createdAt: now,
      };

      // Deactivate previous active version
      strategy.versions.forEach((v) => {
        v.isActive = false;
      });

      strategy.versions.push(version);
      strategy.currentVersionId = version.versionId;
      strategy.currentFileHash = version.fileHash;
      strategy.updatedAt = now;

      return version;
    }

    function setActiveVersion(strategyId: string, versionId: string): void {
      const strategy = getStrategy(strategyId);
      if (!strategy) return;

      strategy.versions.forEach((v) => {
        v.isActive = v.versionId === versionId;
      });

      const activeVersion = strategy.versions.find((v) => v.versionId === versionId);
      if (activeVersion) {
        strategy.currentVersionId = versionId;
        strategy.currentFileHash = activeVersion.fileHash;
      }
      strategy.updatedAt = Date.now();
    }

    function getActiveVersion(strategyId: string): StrategyVersion | undefined {
      const strategy = getStrategy(strategyId);
      return strategy?.versions.find((v) => v.isActive);
    }

    // ==================== Bot Links ====================

    function linkBot(strategyId: string, bot: StrategyBotLink): void {
      const strategy = getStrategy(strategyId);
      if (!strategy) return;

      // Avoid duplicates
      if (!strategy.linkedBots.some((b) => b.botId === bot.botId)) {
        strategy.linkedBots.push(bot);
        strategy.updatedAt = Date.now();
      }
    }

    function unlinkBot(strategyId: string, botId: string): void {
      const strategy = getStrategy(strategyId);
      if (!strategy) return;

      const idx = strategy.linkedBots.findIndex((b) => b.botId === botId);
      if (idx !== -1) {
        strategy.linkedBots.splice(idx, 1);
        strategy.updatedAt = Date.now();
      }
    }

    // ==================== Backtest Links ====================

    function linkBacktest(strategyId: string, backtest: StrategyBacktestLink): void {
      const strategy = getStrategy(strategyId);
      if (!strategy) return;

      if (!strategy.linkedBacktests.some((b) => b.backtestId === backtest.backtestId)) {
        strategy.linkedBacktests.push(backtest);
        strategy.updatedAt = Date.now();
      }
    }

    function unlinkBacktest(strategyId: string, backtestId: string): void {
      const strategy = getStrategy(strategyId);
      if (!strategy) return;

      const idx = strategy.linkedBacktests.findIndex((b) => b.backtestId === backtestId);
      if (idx !== -1) {
        strategy.linkedBacktests.splice(idx, 1);
        strategy.updatedAt = Date.now();
      }
    }

    // ==================== Tags ====================

    function addTag(strategyId: string, tag: string): void {
      const strategy = getStrategy(strategyId);
      if (!strategy) return;

      if (!strategy.tags.includes(tag)) {
        strategy.tags.push(tag);
        strategy.updatedAt = Date.now();
      }
    }

    function removeTag(strategyId: string, tag: string): void {
      const strategy = getStrategy(strategyId);
      if (!strategy) return;

      const idx = strategy.tags.indexOf(tag);
      if (idx !== -1) {
        strategy.tags.splice(idx, 1);
        strategy.updatedAt = Date.now();
      }
    }

    return {
      // State
      strategies,
      // Computed
      strategyMap,
      strategyCount,
      strategiesByRiskLevel,
      strategiesByTag,
      // CRUD
      addStrategy,
      updateStrategy,
      removeStrategy,
      getStrategy,
      // Version management
      addVersion,
      setActiveVersion,
      getActiveVersion,
      // Bot links
      linkBot,
      unlinkBot,
      // Backtest links
      linkBacktest,
      unlinkBacktest,
      // Tags
      addTag,
      removeTag,
    };
  },
  {
    persist: {
      key: 'frequi-strategy-store',
      pick: ['strategies'],
    } as const,
  },
);
