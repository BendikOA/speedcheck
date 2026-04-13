<script lang="ts">
  import './styles.css';
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';
  import Button from '$lib/components/ui/Button/index.svelte';
  import Input from '$lib/components/ui/Input/index.svelte';

  export let form: ActionData;

  let submitting = false;
</script>

<svelte:head>
  <title>Feedback — Turnadus</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="page">
  <h1>Feedback</h1>
  <p class="subtitle">Bug reports, suggestions, or anything else — all appreciated.</p>

  {#if form?.success}
    <div class="success-box">
      Sent. Thanks for reaching out!
    </div>
  {:else}
    <form
      method="POST"
      class="feedback-form"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          await update();
          submitting = false;
        };
      }}
    >
      <div class="row">
        <label>
          <span>Name <span class="optional">(optional)</span></span>
          <Input name="name" placeholder="Your name" autocomplete="name" maxlength="100" />
        </label>
        <label>
          <span>Email <span class="optional">(optional, for replies)</span></span>
          <Input type="email" name="email" placeholder="you@example.com" autocomplete="email" maxlength="200" />
        </label>
      </div>

      <label>
        <span>Type</span>
        <select name="type">
          <option value="Bug report">Bug report</option>
          <option value="Suggestion">Suggestion</option>
          <option value="Data error">Data error</option>
          <option value="General">General</option>
        </select>
      </label>

      <label>
        <span>Message</span>
        <textarea name="message" placeholder="What's on your mind?" rows="6" maxlength="5000" required></textarea>
      </label>

      {#if form?.error}
        <p class="error">{form.error}</p>
      {/if}

      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send feedback'}
      </Button>
    </form>
  {/if}
</div>

