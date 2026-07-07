import { defineStore } from 'pinia';
import { acceptHMRUpdate } from 'pinia';

export type AlertLevel = 'info' | 'warning' | 'critical';
export type AlertChannel = 'telegram' | 'webhook' | 'email' | 'in-app';

export interface AlertRule {
  id: string;
  name: string;
  level: AlertLevel;
  channel: AlertChannel;
  target: string;
  enabled: boolean;
  createdAt: number;
}

export interface AlertHistoryItem {
  id: string;
  level: AlertLevel;
  message: string;
  timestamp: number;
  read: boolean;
  channel: AlertChannel;
}

export const useAlertCenterStore = defineStore(
  'alertCenter',
  () => {
    const rules = ref<AlertRule[]>([]);
    const history = ref<AlertHistoryItem[]>([]);

    function createRule(input: {
      name: string;
      level: AlertLevel;
      channel: AlertChannel;
      target: string;
    }): AlertRule {
      const rule: AlertRule = {
        id: crypto.randomUUID(),
        name: input.name,
        level: input.level,
        channel: input.channel,
        target: input.target,
        enabled: true,
        createdAt: Date.now(),
      };
      rules.value.push(rule);
      return rule;
    }

    function updateRule(ruleId: string, updates: Partial<AlertRule>): void {
      const rule = rules.value.find((r) => r.id === ruleId);
      if (rule) {
        Object.assign(rule, updates);
      }
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

    function addHistoryItem(item: {
      level: AlertLevel;
      message: string;
      channel: AlertChannel;
    }): AlertHistoryItem {
      const historyItem: AlertHistoryItem = {
        id: crypto.randomUUID(),
        level: item.level,
        message: item.message,
        timestamp: Date.now(),
        read: false,
        channel: item.channel,
      };
      history.value.unshift(historyItem);
      // Keep only last 100 items
      if (history.value.length > 100) {
        history.value = history.value.slice(0, 100);
      }
      return historyItem;
    }

    function toggleRead(itemId: string): void {
      const item = history.value.find((i) => i.id === itemId);
      if (item) {
        item.read = !item.read;
      }
    }

    function markAllRead(): void {
      history.value.forEach((item) => {
        item.read = true;
      });
    }

    function deleteHistoryItem(itemId: string): void {
      history.value = history.value.filter((i) => i.id !== itemId);
    }

    function sendTestAlert(channel: AlertChannel, message: string): void {
      // Log the test alert
      const level: AlertLevel = 'info';
      addHistoryItem({ level, message, channel });
      console.log(`[AlertCenter] Test alert sent via ${channel}: ${message}`);
    }

    const unreadCount = computed(() => history.value.filter((i) => !i.read).length);

    return {
      rules,
      history,
      unreadCount,
      createRule,
      updateRule,
      deleteRule,
      toggleRule,
      addHistoryItem,
      toggleRead,
      markAllRead,
      deleteHistoryItem,
      sendTestAlert,
    };
  },
  {
    persist: { pick: ['rules', 'history'] },
  },
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAlertCenterStore, import.meta.hot));
}
