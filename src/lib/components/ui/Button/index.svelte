<!--
  Button Component

  A reusable button component with variants for consistent styling.

  Props:
  - variant: 'primary' | 'secondary' | 'danger' = 'primary'
  - size: 'sm' | 'md' | 'lg' = 'md'
  - disabled: boolean = false
  - fullWidth: boolean = false (for mobile, like start-btn)
  - onClick: () => void

  Slots:
  - Default slot for button text/content
-->

<script lang="ts">
  import './styles.css';
  import { tooltip as applyTooltip } from '$lib/tooltip';

  export let variant: 'primary' | 'secondary' | 'danger' | 'toggle' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled = false;
  export let fullWidth = false;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let onClick: () => void = () => {};
  export let active = false;
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