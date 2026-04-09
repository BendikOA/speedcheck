<!--
  Input Component

  A reusable input component with consistent styling.

  Props:
  - type: string = 'text'
  - placeholder: string = ''
  - value: string = ''
  - disabled: boolean = false
  - required: boolean = false
  - variant: 'default' | 'accent' = 'default' (for different border colors)
  - id: string | undefined
  - name: string | undefined
  - autocomplete: string | undefined
-->

<script lang="ts">
  import './styles.css';

  export let type: string = 'text';
  export let placeholder: string = '';
  export let value: string = '';
  export let disabled: boolean = false;
  export let required: boolean = false;
  export let variant: 'default' | 'accent' = 'default';
  export let id: string | undefined = undefined;
  export let name: string | undefined = undefined;
  export let autocomplete: string | undefined = undefined;
</script>

<input
  {type}
  {placeholder}
  bind:value
  {disabled}
  {required}
  {id}
  {name}
  class="input {variant}"
  {...$$restProps}
/>