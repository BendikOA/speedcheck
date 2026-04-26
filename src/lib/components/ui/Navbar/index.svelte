<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';

  let menuOpen = false;
  let navLinksEl: HTMLElement;
  let ulLeft = 0;
  let ulWidth = 0;
  let ulVisible = false;

  function updateUnderline() {
    if (!navLinksEl) return;
    const active = navLinksEl.querySelector('a.active') as HTMLElement | null;
    if (!active) { ulVisible = false; return; }
    const cr = navLinksEl.getBoundingClientRect();
    const lr = active.getBoundingClientRect();
    ulLeft  = lr.left - cr.left;
    ulWidth = lr.width;
    ulVisible = true;
  }

  onMount(updateUnderline);

  afterNavigate(() => {
    menuOpen = false;
    updateUnderline();
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') menuOpen = false;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<nav>
  <div class="nav-inner">

    <a href="/" class="brand">
      <img src="/Rulebook.png" alt="" aria-hidden="true" class="brand-img" />
      <span class="brand-name">TURNADUS</span>
    </a>

    <div class="nav-right">
      <div class="nav-links" bind:this={navLinksEl}>
        <a href="/"      class:active={$page.url.pathname === '/'}>Pregame</a>
        <a href="/game"  class:active={$page.url.pathname === '/game'}>Game</a>
        <a href="/meta"  class:active={$page.url.pathname === '/meta'}>Meta</a>
        <a href="/build" class:active={$page.url.pathname === '/build'}>Teambuilder</a>
        <a href="/teams" class:active={$page.url.pathname === '/teams'}>Team Report</a>
        <span
          class="nav-underline"
          aria-hidden="true"
          style="left: {ulLeft}px; width: {ulWidth}px; opacity: {ulVisible ? 1 : 0}"
        ></span>
      </div>

      <a
        href="https://ko-fi.com/T6T21XBBI8"
        target="_blank"
        rel="noopener"
        class="kofi-btn"
      >SUPPORT ME ON KOFI</a>
    </div>

    <button
      class="hamburger"
      on:click={() => (menuOpen = !menuOpen)}
      aria-label="Menu"
      aria-expanded={menuOpen}
    >
      {#if menuOpen}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      {:else}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      {/if}
    </button>

  </div>
</nav>

{#if menuOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="drawer-backdrop" on:click={() => (menuOpen = false)}></div>

  <nav class="drawer" aria-label="Mobile navigation">
    <div class="drawer-header">
      <a href="/" class="brand drawer-brand">
        <img src="/Rulebook.png" alt="" aria-hidden="true" class="brand-img" style="height:24px" />
        <span class="brand-name" style="font-size:1.1rem">TURNADUS</span>
      </a>
      <button class="drawer-close" on:click={() => (menuOpen = false)} aria-label="Close menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <div class="drawer-links">
      <a href="/"      class:active={$page.url.pathname === '/'}>Pregame</a>
      <a href="/game"  class:active={$page.url.pathname === '/game'}>Game</a>
      <a href="/meta"  class:active={$page.url.pathname === '/meta'}>Meta</a>
      <a href="/build" class:active={$page.url.pathname === '/build'}>Teambuilder</a>
      <a href="/teams" class:active={$page.url.pathname === '/teams'}>Team Report</a>
    </div>

    <div class="drawer-footer">
      <div class="drawer-kofi">
        Turnadus is free, no ads, built solo. If it helped you in a game,
        <a href="https://ko-fi.com/T6T21XBBI8" target="_blank" rel="noopener">
          consider buying me a coffee on Ko-fi ☕
        </a>
      </div>
    </div>
  </nav>
{/if}
