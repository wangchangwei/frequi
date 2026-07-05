<template>
  <div class="mt-5">
    <div class="flex justify-center">
      <BotList class="max-w-xl" />
    </div>
    <USeparator class="my-5" />
    <AppIcon class="my-5 sm:w-80 sm:h-80 w-64 h-64" />

    <h1 class="font-bold text-2xl sm:text-4xl mb-4 transition-all">
      Welcome to the <AppText class="text-2xl! sm:text-4xl!" />
    </h1>
    <div>此页面用于控制你的交易机器人。</div>
    <USeparator class="my-5" />
    <p class="mb-2">
      If you need any help, please refer to the
      <a
        class="text-primary underline cursor-pointer"
        href="https://www.freqtrade.io/en/latest/"
        target="_blank"
      >
        Freqtrade Documentation
      </a>
      .
    </p>

    <p class="mb-5">祝你使用愉快 - <i>Freqtrade 团队</i></p>
  </div>
</template>
