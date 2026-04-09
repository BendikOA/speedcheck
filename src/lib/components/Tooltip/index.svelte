<script lang="ts">
  import { tooltipStore, hideTooltip } from '$lib/tooltip';
  import './styles.css';

  $: t = $tooltipStore;

  // Keep tooltip on screen — appear above cursor, clamped horizontally
  $: left = Math.max(8, Math.min(t.x - 8, (typeof window !== 'undefined' ? window.innerWidth : 400) - 220));
  $: top  = t.y - 8;
</script>

<svelte:window
  on:touchstart={hideTooltip}
  on:scroll={hideTooltip}
  on:keydown={e => e.key === 'Escape' && hideTooltip()}
/>

{#if t.visible && t.text}
  <div
    class="tt"
    role="tooltip"
    aria-hidden="true"
    style="left:{left}px; top:{top}px; transform: translateY(-100%)"
  >
    {t.text}
  </div>
{/if}