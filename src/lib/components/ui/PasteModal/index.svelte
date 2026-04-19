<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from '$lib/components/ui/Button/index.svelte';

  export let open: boolean = false;
  export let loading: boolean = false;
  export let error: string = '';
  export let placeholder: string = 'Paste a Showdown team or pokepast.es URL…';
  export let showCancel: boolean = true;

  const dispatch = createEventDispatcher<{ close: void; import: string }>();

  let text = '';

  $: if (!open) text = '';

  function close() {
    dispatch('close');
  }

  function submit() {
    dispatch('import', text);
  }
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="pm-backdrop" on:click|self={close}>
    <div class="pm-box" on:click|stopPropagation>
      <div class="pm-header">
        <span class="pm-title">Import Poképaste</span>
        <button class="pm-close" on:click={close}>✕</button>
      </div>
      <slot />
      <textarea
        class="pm-textarea"
        {placeholder}
        bind:value={text}
        rows="8"
        autocomplete="off"
        spellcheck="false"
      ></textarea>
      {#if error}
        <p class="pm-error">{error}</p>
      {/if}
      <div class="pm-actions">
        <Button variant="primary" size="sm" disabled={loading || !text.trim()} onClick={submit}>
          {loading ? 'Importing…' : 'Import'}
        </Button>
        {#if showCancel}
          <Button variant="secondary" size="sm" onClick={close}>Cancel</Button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .pm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 500;
    padding: 1rem;
  }

  .pm-box {
    background: var(--gb-4);
    border: 1px solid var(--gb-3);
    border-radius: var(--radius);
    width: 100%;
    max-width: 560px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  }

  .pm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pm-title {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--gb-hi);
  }

  .pm-close {
    background: transparent;
    border: none;
    color: var(--gb-low);
    font-size: 1rem;
    cursor: pointer;
    padding: 0.15rem 0.4rem;
    border-radius: var(--radius-sm, 4px);
    min-height: 36px;
    min-width: 36px;
  }
  .pm-close:hover {
    background: var(--gb-3);
    color: var(--gb-hi);
  }

  .pm-textarea {
    width: 100%;
    background: var(--gb-5, var(--gb-3));
    border: 1px solid var(--gb-3);
    border-radius: var(--radius-sm, 4px);
    color: var(--gb-hi);
    font-family: monospace;
    font-size: 0.8rem;
    padding: 0.6rem;
    resize: vertical;
    box-sizing: border-box;
  }
  .pm-textarea:focus {
    outline: none;
    border-color: var(--accent);
  }

  .pm-error {
    font-size: 0.8rem;
    color: var(--danger);
    margin: 0;
  }

  .pm-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
</style>
