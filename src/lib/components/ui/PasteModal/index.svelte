<script lang="ts">
  import './styles.scss';
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
