<script setup lang="ts">
const pairlistStore = usePairlistConfigStore();
const copyFromConfig = ref('');

const configNames = computed(() =>
  pairlistStore.savedConfigs.filter((c) => c.name !== pairlistStore.config.name).map((c) => c.name),
);
</script>
<template>
  <BaseCollapsible title="黑名单">
    <div class="pb-1 p-2">
      <div class="flex mb-4 items-center gap-2">
        <span class="col-auto">从以下配置复制:</span>
        <USelect v-model="copyFromConfig" size="sm" class="grow" :items="configNames" />
        <UButton
          title="复制"
          size="sm"
          color="neutral"
          icon="mdi:content-copy"
          @click="pairlistStore.duplicateBlacklist(copyFromConfig)"
        />
      </div>
      <USeparator class="mb-2" />
      <div class="flex flex-col w-full items-center">
        <h3>黑名单交易对</h3>
        <div
          v-for="(item, i) in pairlistStore.config.blacklist"
          :key="i"
          class="mb-2 flex flex-row max-w-md gap-2 my-auto items-center"
        >
          <UInput v-model="pairlistStore.config.blacklist[i]" class="w-full" />
          <span>
            <UButton
              size="sm"
              color="neutral"
              icon="mdi:close"
              @click="pairlistStore.removeFromBlacklist(i)"
            />
          </span>
        </div>
      </div>
      <UButton
        icon="mdi:plus"
        variant="solid"
        label="添加"
        @click="pairlistStore.addToBlacklist()"
      />
    </div>
  </BaseCollapsible>
</template>
