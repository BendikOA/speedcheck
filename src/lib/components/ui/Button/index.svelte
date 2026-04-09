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

  export let variant: 'primary' | 'secondary' | 'danger' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled = false;
  export let fullWidth = false;
  export let onClick: () => void = () => {};
</script>

<button
  class="btn {variant} {size}"
  class:full-width={fullWidth}
  {disabled}
  on:click={onClick}
>
  <slot>Button</slot>
</button>