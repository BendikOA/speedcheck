<script lang="ts">
  import { tooltipStore, hideTooltip } from '$lib/tooltip';

  $: t = $tooltipStore;

  // Keep tooltip on screen
  $: left = Math.min(t.x + 12, (typeof window !== 'undefined' ? window.innerWidth : 400) - 220);
  $: top  = t.y + 16;
</script>

<svelte:window
  on:touchstart={hideTooltip}
  on:scroll={hideTooltip}
  on:keydown={e => e.key === 'Escape' && hideTooltip()}
/>

{#if t.visible && t.text}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="tt"
    style="left:{left}px; top:{top}px"
    on:mouseenter={() => tooltipStore.update(s => ({ ...s, visible: false }))}
  >
    {t.text}
  </div>
{/if}

<style>
  .tt {
    position: fixed;
    z-index: 9999;
    max-width: 210px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.4rem 0.6rem;
    font-size: 0.78rem;
    line-height: 1.4;
    color: var(--text);
    pointer-events: none;
    box-shadow: 0 4px 16px rgba(0,0,0,0.35);
    white-space: pre-line;
  }
</style>
