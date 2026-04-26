<script lang="ts">
  import './styles.scss';
  /** Full list of options to filter from */
  export let items: string[] = [];
  /** Current value shown in the input */
  export let value: string = '';
  export let placeholder: string = 'Search…';
  export let id: string | undefined = undefined;
  /** Called every time the typed text changes */
  export let oninput: ((v: string) => void) | undefined = undefined;
  /** Called when the user picks an item from the dropdown */
  export let onselect: ((v: string) => void) | undefined = undefined;

  let inputVal = value;
  let open = false;
  let prevValue = value;

  // Sync when the parent sets a genuinely different value (e.g. clearing the field).
  // Skip when it's just the parent reflecting back what was typed, so we don't close
  // the dropdown on every keystroke.
  $: if (value !== prevValue) {
    prevValue = value;
    if (value !== inputVal) {
      inputVal = value;
      open = false;
    }
  }

  $: suggestions = items.length
    ? (inputVal.length >= 1
        ? items.filter(i => i.toLowerCase().includes(inputVal.toLowerCase())).slice(0, 14)
        : items.slice(0, 14))
    : [];

  $: if (!suggestions.length && !inputVal) open = false;

  function handleInput(e: Event) {
    inputVal = (e.target as HTMLInputElement).value;
    if (items.length) open = true;
    oninput?.(inputVal);
  }

  function handleFocus() {
    if (items.length) open = true;
  }

  function handleBlur() {
    setTimeout(() => { open = false; }, 160);
  }

  function select(item: string) {
    inputVal = item;
    open = false;
    onselect?.(item);
    oninput?.(item);
  }
</script>

<div class="ac-wrap">
  <input
    {id}
    class="ac-input"
    value={inputVal}
    {placeholder}
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    spellcheck={false}
    on:input={handleInput}
    on:focus={handleFocus}
    on:blur={handleBlur}
  />
  {#if open && suggestions.length > 0}
    <div class="ac-list" role="listbox">
      {#each suggestions as item (item)}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="ac-item"
          role="option"
          aria-selected={false}
          tabindex="-1"
          on:mousedown|preventDefault={() => select(item)}
        >{item}</div>
      {/each}
    </div>
  {/if}
</div>
