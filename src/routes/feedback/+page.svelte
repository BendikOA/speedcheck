<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

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
          <input type="text" name="name" placeholder="Your name" autocomplete="name" maxlength="100" />
        </label>
        <label>
          <span>Email <span class="optional">(optional, for replies)</span></span>
          <input type="email" name="email" placeholder="you@example.com" autocomplete="email" maxlength="200" />
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

      <button type="submit" class="submit-btn" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send feedback'}
      </button>
    </form>
  {/if}
</div>

<style>
  .page {
    max-width: 560px;
  }

  h1 {
    font-size: 1.6rem;
    margin-bottom: 0.35rem;
  }

  .subtitle {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 2rem;
  }

  .feedback-form {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 480px) {
    .row {
      grid-template-columns: 1fr;
    }
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-height: unset;
  }

  label span {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .optional {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
  }

  input, select, textarea {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    padding: 0.6rem 0.85rem;
    width: 100%;
    transition: border-color 0.15s;
    resize: vertical;
  }

  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: var(--text-muted);
  }

  select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23aaaaaa' stroke-width='2' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.8rem center;
    padding-right: 2.2rem;
    cursor: pointer;
  }

  textarea {
    min-height: 140px;
    font-size: 15px;
    line-height: 1.5;
  }

  .error {
    color: var(--danger);
    font-size: 0.85rem;
  }

  .success-box {
    background: color-mix(in srgb, var(--success) 12%, var(--surface));
    border: 1px solid var(--success);
    border-radius: var(--radius);
    color: var(--success);
    padding: 1rem 1.25rem;
    font-size: 0.95rem;
  }

  .submit-btn {
    align-self: flex-start;
    background: var(--accent);
    border: none;
    border-radius: var(--radius);
    color: var(--bg);
    font-weight: 600;
    font-size: 0.95rem;
    padding: 0 1.5rem;
    min-height: 44px;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .submit-btn:not(:disabled):hover {
    opacity: 0.85;
  }
</style>
