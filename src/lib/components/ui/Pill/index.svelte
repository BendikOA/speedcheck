<script lang="ts">
  import './styles.scss';
  import { tooltip as tooltipAction } from '$lib/tooltip';

  /** Accent color — any valid CSS color string, e.g. "#f5c96c" or "var(--gb-1)".
   *  When omitted the pill renders in muted/neutral style. */
  export let color: string | null = null;

  /** 'primary' = dark fill + light text (default). 'alt' = light background + colored text/border. */
  export let variant: 'primary' | 'alt' = 'primary';

  /** Set to false to render muted even when a color is supplied (e.g. inactive toggle). */
  export let active: boolean = true;

  /** Adds cursor:pointer and hover styles. Forward on:click from the parent. */
  export let interactive: boolean = false;

  /** Tooltip text — shown on hover/tap via the global tooltip system. */
  export let tooltip: string = '';

  /** Renders text with a strikethrough — used for suppressed/blocked states. */
  export let strikethrough: boolean = false;

  $: showColor = !!color && active;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<span
  class="pill {variant}"
  class:colored={showColor}
  class:interactive
  class:strikethrough
  style={showColor ? `--pill-color: ${color}` : ''}
  use:tooltipAction={tooltip}
  on:click
>
  <slot />
</span>
