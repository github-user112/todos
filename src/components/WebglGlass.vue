<template><canvas v-if="active" ref="canvas" class="webgl-glass-canvas" aria-hidden="true" /></template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { createGlassRenderer } from '../utils/webgl-glass.js';
const active = ref(false);
const canvas = ref(null);
let observer;
let renderer;
let revision = 0;
watch(active, async (enabled) => {
  const current = ++revision;
  renderer?.dispose();
  renderer = null;
  await nextTick();
  if (enabled && current === revision && canvas.value) {
    renderer = createGlassRenderer(canvas.value);
  }
});
onMounted(() => {
  const sync = () => { active.value = document.documentElement.classList.contains('webgl-glass-theme'); };
  observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  sync();
});
onBeforeUnmount(() => { revision++; observer?.disconnect(); renderer?.dispose(); });
</script>

<style>
.webgl-glass-canvas { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
</style>
