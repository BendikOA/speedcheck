<script lang="ts">
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

<style>
  .ac-wrap {
    position: relative;
    width: 100%;
  }

  .ac-input {
    width: 100%;
    padding: 0 0.6rem;
    background: var(--gb-3);
    border: 1px solid var(--gb-3);
    border-radius: var(--radius-sm);
    color: var(--gb-2);
    font-size: 0.88rem;
    min-height: 40px;
    box-sizing: border-box;
  }
  .ac-input:focus-visible { border-color: var(--gb-1); outline: none; }
  .ac-input:focus { border-color: var(--gb-1); outline: none; }

  .ac-list {
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    right: 0;
    background: var(--gb-4);
    border: 1px solid var(--gb-3);
    border-radius: var(--radius-sm);
    z-index: 1000;
    max-height: 260px;
    overflow-y: auto;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  }

  .ac-item {
    padding: 0.45rem 0.7rem;
    font-size: 0.85rem;
    color: var(--gb-2);
    cursor: pointer;
    border-bottom: 1px solid color-mix(in srgb, var(--gb-3) 50%, transparent);
    user-select: none;
  }
  .ac-item:last-child { border-bottom: none; }
  .ac-item:hover { background: var(--gb-3); }
</style>
