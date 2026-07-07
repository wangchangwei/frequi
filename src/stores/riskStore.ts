import { defineStore } from 'pinia';
import type { RiskRule, RiskEvent, RiskExposure, RiskActionType, RiskScope } from '@/types/risk';
import { acceptHMRUpdate } from 'pinia';

export const useRiskStore = defineStore(
  'risk',
  () => {
    const rules = ref<RiskRule[]>([]);
    const events = ref<RiskEvent[]>([]);
    const exposures = ref<RiskExposure[]>([]);

    function createRule(input: {
      name: string;
      scope: RiskScope;
      scopeTarget?: string;
      condition: string;
      threshold: number;
      action: RiskActionType;
      actionTarget?: string;
    }): RiskRule {
      const rule: RiskRule = {
        id: crypto.randomUUID(),
        name: input.name,
        scope: input.scope,
        scopeTarget: input.scopeTarget,
        condition: input.condition,
        threshold: input.threshold,
        action: input.action,
        actionTarget: input.actionTarget,
        enabled: true,
        triggeredCount: 0,
        createdAt: Date.now(),
      };
      rules.value.push(rule);
      return rule;
    }

    function updateRule(ruleId: string, updates: Partial<RiskRule>): void {
      const rule = rules.value.find((r) => r.id === ruleId);
      if (!rule) return;
      Object.assign(rule, updates);
    }

    function deleteRule(ruleId: string): void {
      rules.value = rules.value.filter((r) => r.id !== ruleId);
    }

    function toggleRule(ruleId: string): void {
      const rule = rules.value.find((r) => r.id === ruleId);
      if (rule) {
        rule.enabled = !rule.enabled;
      }
    }

    function triggerRule(ruleId: string, details: string): RiskEvent {
      const rule = rules.value.find((r) => r.id === ruleId);
      if (!rule) throw new Error(`Rule ${ruleId} not found`);

      rule.triggeredCount++;
      rule.lastTriggeredAt = Date.now();

      const event: RiskEvent = {
        id: crypto.randomUUID(),
        ruleId: rule.id,
        ruleName: rule.name,
        scope: rule.scope,
        scopeTarget: rule.scopeTarget ?? '',
        action: rule.action,
        triggeredAt: Date.now(),
        resolved: false,
        details,
      };
      events.value.unshift(event);
      return event;
    }

    function resolveEvent(eventId: string): void {
      const event = events.value.find((e) => e.id === eventId);
      if (event) {
        event.resolved = true;
        event.resolvedAt = Date.now();
      }
    }

    function updateExposure(exposure: RiskExposure): void {
      const idx = exposures.value.findIndex(
        (e) =>
          (e.botId && e.botId === exposure.botId) ||
          (e.accountId && e.accountId === exposure.accountId) ||
          (e.coin && e.coin === exposure.coin),
      );
      if (idx >= 0) {
        exposures.value[idx] = { ...exposure, updatedAt: Date.now() };
      } else {
        exposures.value.push({ ...exposure, updatedAt: Date.now() });
      }
    }

    function getExposureByScope(scope: RiskScope, target?: string): RiskExposure | undefined {
      return exposures.value.find((e) => {
        if (scope === 'bot' && e.botId === target) return true;
        if (scope === 'account' && e.accountId === target) return true;
        if (scope === 'coin' && e.coin === target) return true;
        if (scope === 'market' && !target) return true;
        return false;
      });
    }

    // Getters
    const enabledRules = computed(() => rules.value.filter((r) => r.enabled));
    const activeEvents = computed(() => events.value.filter((e) => !e.resolved));
    const rulesByScope = (scope: RiskScope) =>
      computed(() => rules.value.filter((r) => r.scope === scope));

    return {
      rules,
      events,
      exposures,
      enabledRules,
      activeEvents,
      createRule,
      updateRule,
      deleteRule,
      toggleRule,
      triggerRule,
      resolveEvent,
      updateExposure,
      getExposureByScope,
      rulesByScope,
    };
  },
  {
    persist: { pick: ['rules', 'events', 'exposures'] },
  },
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useRiskStore, import.meta.hot));
}
