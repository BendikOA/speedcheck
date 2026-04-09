<!--
  SearchCombobox Component

  A searchable dropdown input component using bits-ui Combobox.

  Used in:
  - Team edit page (teams/[id]/edit/+page.svelte) for:
    - Item selection
    - Move selection

  Features:
  - Real-time filtering of options as user types
  - Dropdown with keyboard navigation
  - Custom styling with global CSS classes
  - Controlled value binding

  Props:
  - items: Array of strings to filter from
  - value: Current input value (controlled)
  - placeholder: Placeholder text
  - id: Optional input ID

  Events:
  - select: Dispatches when an item is selected from dropdown
  - input: Dispatches on input changes
-->

<script lang="ts">
  import { items as itemsStore, value as valueStore, placeholder as placeholderStore, id as idStore, inputValue, filtered, onValueChange, onOpenChangeComplete } from './searchCombobox';
  import { Combobox } from "bits-ui";
  import { createEventDispatcher } from "svelte";
  import './styles.css';

  /** Full list of options to filter from */
  export let items: string[] = [];
  /** Current value shown in the input */
  export let value: string = "";
  export let placeholder: string = "Search…";
  export let id: string | undefined = undefined;

  $: $itemsStore = items;
  $: $valueStore = value;
  $: $placeholderStore = placeholder;
  $: $idStore = id;
  $: $inputValue = value;

  const dispatch = createEventDispatcher<{ select: string; input: string }>();
</script>

<Combobox.Root
  type="single"
  bind:value={$inputValue}
  onValueChange={(v) => onValueChange(dispatch, v)}
  onOpenChangeComplete={(open) => onOpenChangeComplete(dispatch, open, $inputValue)}
>
  <Combobox.Input
    {id}
    {placeholder}
    class="cb-input"
    autocomplete="off"
    autocorrect="off"
    spellcheck={false}
  />

  {#if $filtered.length > 0}
    <Combobox.Portal>
      <Combobox.Content class="cb-content" sideOffset={2}>
        <Combobox.Viewport class="cb-viewport">
          {#each $filtered as item (item)}
            <Combobox.Item value={item} label={item} class="cb-item">
              {#snippet children({ highlighted })}
                <span class="cb-item-label">{item}</span>
              {/snippet}
            </Combobox.Item>
          {/each}
        </Combobox.Viewport>
      </Combobox.Content>
    </Combobox.Portal>
  {/if}
</Combobox.Root>