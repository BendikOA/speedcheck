<script lang="ts">
  import { Combobox } from "bits-ui";
  import { createEventDispatcher } from "svelte";
  import './styles.css';

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
  bind:value={inputValue}
  onValueChange={(v) => {
    if (v) dispatch("select", v);
  }}
  onOpenChangeComplete={(open) => {
    if (!open) dispatch("input", inputValue);
  }}
>
  <Combobox.Input
    {id}
    {placeholder}
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