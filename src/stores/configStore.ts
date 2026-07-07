/**
 * Config Template Store
 * Phase 3: Templated, versioned config system
 */
import type {
  ConfigTemplate,
  ConfigTemplateInput,
  ConfigVersion,
  ConfigVersionInput,
} from '@/types/configTemplate';

export const useConfigStore = defineStore(
  'config',
  () => {
    // ==================== State ====================

    const templates = ref<ConfigTemplate[]>([]);
    /** Map of templateId -> ConfigVersion[] */
    const versions = ref<Map<string, ConfigVersion[]>>(new Map());

    // ==================== Getters ====================

    const templateCount = computed(() => templates.value.length);

    function getTemplateById(id: string): ConfigTemplate | undefined {
      return templates.value.find((t) => t.id === id);
    }

    function getVersionsByTemplateId(templateId: string): ConfigVersion[] {
      return versions.value.get(templateId) ?? [];
    }

    function getLatestVersion(templateId: string): ConfigVersion | undefined {
      const vers = getVersionsByTemplateId(templateId);
      return vers.length > 0 ? vers[vers.length - 1] : undefined;
    }

    function getLatestProductionVersion(templateId: string): ConfigVersion | undefined {
      const vers = getVersionsByTemplateId(templateId);
      return vers.find((v) => v.isProduction);
    }

    // ==================== Template CRUD ====================

    function createTemplate(input: ConfigTemplateInput): ConfigTemplate {
      const now = Date.now();
      const template: ConfigTemplate = {
        id: `tpl_${now}`,
        name: input.name,
        category: input.category,
        description: input.description,
        parameters: input.parameters ?? {},
        dryRunParams: input.dryRunParams ?? {},
        liveParams: input.liveParams ?? {},
        createdAt: now,
        updatedAt: now,
        tags: input.tags ?? [],
      };

      templates.value.push(template);
      // Initialize empty versions map
      versions.value.set(template.id, []);

      return template;
    }

    function updateTemplate(
      templateId: string,
      updates: Partial<Omit<ConfigTemplate, 'id' | 'createdAt'>>,
    ): void {
      const index = templates.value.findIndex((t) => t.id === templateId);
      if (index === -1) {
        throw new Error(`Template ${templateId} not found`);
      }

      templates.value[index] = {
        ...templates.value[index],
        ...updates,
        updatedAt: Date.now(),
      };
    }

    function deleteTemplate(templateId: string): void {
      const index = templates.value.findIndex((t) => t.id === templateId);
      if (index !== -1) {
        templates.value.splice(index, 1);
        versions.value.delete(templateId);
      }
    }

    // ==================== Version Management ====================

    function createVersion(templateId: string, input: ConfigVersionInput): ConfigVersion {
      const existing = getVersionsByTemplateId(templateId);
      const now = Date.now();

      const version: ConfigVersion = {
        id: `ver_${now}`,
        templateId,
        version: existing.length + 1,
        content: input.content ?? {},
        createdAt: now,
        createdBy: 'user', // TODO: replace with actual user
        isLocked: false,
        isProduction: input.isProduction ?? false,
        changelog: input.changelog,
      };

      // If marking as production, unmark others
      if (version.isProduction) {
        existing.forEach((v) => {
          v.isProduction = false;
        });
      }

      const vers = versions.value.get(templateId) ?? [];
      vers.push(version);
      versions.value.set(templateId, vers);

      // Update template updatedAt
      const tpl = getTemplateById(templateId);
      if (tpl) {
        tpl.updatedAt = now;
      }

      return version;
    }

    function lockVersion(templateId: string, versionId: string): void {
      const vers = versions.value.get(templateId) ?? [];
      const v = vers.find((x) => x.id === versionId);
      if (v) {
        v.isLocked = true;
      }
    }

    function unlockVersion(templateId: string, versionId: string): void {
      const vers = versions.value.get(templateId) ?? [];
      const v = vers.find((x) => x.id === versionId);
      if (v) {
        v.isLocked = false;
      }
    }

    function markProduction(templateId: string, versionId: string): void {
      const vers = versions.value.get(templateId) ?? [];
      // Unmark all
      vers.forEach((v) => {
        v.isProduction = v.id === versionId;
      });
    }

    function rollbackToVersion(templateId: string, versionId: string): ConfigVersion | undefined {
      const vers = versions.value.get(templateId) ?? [];
      const target = vers.find((v) => v.id === versionId);
      if (!target) return undefined;

      // Non-destructive rollback: create a new version with the target's content
      return createVersion(templateId, {
        content: { ...target.content },
        changelog: `回滚到版本 v${target.version} (${target.id})`,
        isProduction: false,
      });
    }

    return {
      // State
      templates,
      versions,
      // Getters
      templateCount,
      getTemplateById,
      getVersionsByTemplateId,
      getLatestVersion,
      getLatestProductionVersion,
      // Template CRUD
      createTemplate,
      updateTemplate,
      deleteTemplate,
      // Version management
      createVersion,
      lockVersion,
      unlockVersion,
      markProduction,
      rollbackToVersion,
    };
  },
  {
    persist: {
      key: 'frequi-config-store',
      pick: ['templates', 'versions'],
    } as const,
  },
);
