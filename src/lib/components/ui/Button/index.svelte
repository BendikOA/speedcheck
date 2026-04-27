<script lang="ts">
  import './styles.scss';
  import { tooltip as applyTooltip } from '$lib/tooltip';

  export let variant: 'primary' | 'secondary' | 'accent' | 'brand' = 'primary';
  export let size: 'sm' | 'md' = 'md';
  export let disabled = false;
  export let active = false;
  export let fullWidth = false;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let onClick: () => void = () => {};
  export let tooltip = '';

  let cls = '';
  export { cls as class };
</script>

<button
  class="btn {variant} {size} {cls}"
  class:full-width={fullWidth}
  class:active
  {disabled}
  {type}
  on:click={onClick}
  use:applyTooltip={tooltip}
>
  <slot>Button</slot>
</button>
