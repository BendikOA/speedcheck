<!--
  Tooltip Component

  A global tooltip overlay that displays contextual help text.

  Used in:
  - Layout (+layout.svelte) as the main tooltip instance
  - Throughout the app via the tooltip store and use:tooltip action

  Features:
  - Positioned absolutely based on mouse/touch coordinates
  - Auto-hides on scroll, touch, or Escape key
  - Supports multi-line text with pre-line whitespace
  - Z-index layered above other content

  The component subscribes to a global tooltip store and shows
  text when the store has visible: true. Position is calculated
  relative to the triggering element's coordinates.
-->

<script lang="ts">
  import { t, left, top } from './tooltip';
  import { hideTooltip } from '$lib/tooltip';
  import './styles.scss';
</script>

<svelte:window
  on:touchstart={hideTooltip}
  on:scroll={hideTooltip}
  on:keydown={e => e.key === 'Escape' && hideTooltip()}
/>

{#if $t.visible && $t.text}
  <div
    class="tt"
    role="tooltip"
    aria-hidden="true"
    style="left:{$left}px; top:{$top}px; transform: translateY(-100%)"
  >
    {$t.text}
  </div>
{/if}