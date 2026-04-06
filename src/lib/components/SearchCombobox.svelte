<script lang="ts">
  import { Combobox } from "bits-ui";
  import { createEventDispatcher } from "svelte";

  /** Full list of options to filter from */
  export let items: string[] = [];
  /** Current value shown in the input */
  export let value: string = "";
  export let placeholder: string = "Search…";
  export let id: string | undefined = undefined;

  const dispatch = createEventDispatcher<{ select: string; input: string }>();

  let inputValue = value;
  $: inputValue = value;

  $: filtered =
    inputValue.length < 2
      ? []
      : items
          .filter((item) =>
            item.toLowerCase().includes(inputValue.toLowerCase())
          )
          .slice(0, 10);
</script>

<Combobox.Root
  type="single"
  onSelectedChange={(v) => {
    if (v?.value) {
      inputValue = v.value;
      dispatch("select", v.value);
    }
  }}
  onOpenChangeComplete={(open) => {
    if (!open) dispatch("input", inputValue);
  }}
>
  <Combobox.Input
    {id}
    {placeholder}
    value={inputValue}
    oninput={(e) => {
      inputValue = e.currentTarget.value;
      dispatch("input", inputValue);
    }}
    class="cb-input"
    autocomplete="off"
    autocorrect="off"
    spellcheck={false}
  />

  {#if filtered.length > 0}
    <Combobox.Portal>
      <Combobox.Content class="cb-content" sideOffset={2}>
        <Combobox.Viewport class="cb-viewport">
          {#each filtered as item (item)}
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

<style>
  :global(.cb-input) {
    flex: 1;
    width: 100%;
    padding: 0 0.6rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-family: var(--font);
    font-size: 0.85rem;
    min-height: 44px;
    transition: border-color 0.15s;
    outline: none;
  }

  :global(.cb-input:focus) {
    border-color: var(--accent);
  }

  :global(.cb-content) {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 999;
    overflow: hidden;
    min-width: var(--bits-combobox-anchor-width);
    width: var(--bits-combobox-anchor-width);
  }

  :global(.cb-viewport) {
    max-height: 220px;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.25rem;
  }

  :global(.cb-item) {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0 0.7rem;
    min-height: 40px;
    border-radius: var(--radius-sm);
    background: none;
    border: none;
    color: var(--text);
    font-family: var(--font);
    font-size: 0.85rem;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
    outline: none;
  }

  :global(.cb-item[data-highlighted]) {
    background: var(--border);
    color: var(--text);
  }

  :global(.cb-item-label) {
    flex: 1;
  }
</style>
