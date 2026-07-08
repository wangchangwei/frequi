<script setup lang="ts">
defineProps<{
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  scrollable?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <UModal :size="size || 'md'" :scrollable="scrollable" @update:open="if (!$event) emit('close');">
    <template #header>
      <div
        class="px-6 pt-5 pb-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center"
      >
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{{ title }}</h3>
        <UButton
          color="neutral"
          variant="ghost"
          size="md"
          icon="mdi-close"
          @click="emit('close')"
        />
      </div>
    </template>

    <template #body>
      <div class="p-6 space-y-4">
        <slot />
      </div>
    </template>

    <template #footer>
      <div
        v-if="$slots.footer"
        class="border-t border-neutral-200 dark:border-neutral-800 pt-4 px-6 pb-5 flex justify-end gap-2"
      >
        <slot name="footer" />
      </div>
    </template>
  </UModal>
</template>
