<script lang="ts">
  import '../app.css';
  import { browser, dev } from '$app/environment';
  import { page } from '$app/stores';
  import Tooltip from '$lib/components/Tooltip.svelte';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';

  injectAnalytics({ mode: dev ? 'development' : 'production' });

  let dark = true;
  if (browser) {
    const saved = localStorage.getItem('theme');
    dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  function toggleTheme() {
    dark = !dark;
    const t = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
  }

  let menuOpen = false;
  // Close menu on any navigation or Escape
  $: if ($page.url.pathname) menuOpen = false;
  function handleKeydown(e: KeyboardEvent) { if (e.key === 'Escape') menuOpen = false; }
</script>

<nav>
  <a href="/" class="brand">
    <img src="https://play.pokemonshowdown.com/sprites/itemicons/quick-ball.png" alt="" class="brand-icon" />
    Speedcheck
  </a>

  <!-- Desktop nav links -->
  <div class="nav-links">
    <a href="/"            class:active={$page.url.pathname === '/'}>Teams</a>
    <a href="/game"        class:active={$page.url.pathname === '/game'}>Game</a>
    <a href="/tiers"       class:active={$page.url.pathname === '/tiers'}>All Tiers</a>
    <a href="/boost-tiers" class:active={$page.url.pathname === '/boost-tiers'}>Boost Tiers</a>
    <a href="/quiz"        class:active={$page.url.pathname === '/quiz'}>Quiz</a>
  </div>

  <!-- Desktop theme toggle -->
  <button class="theme-toggle" on:click={toggleTheme} aria-label="Toggle theme">
    {#if dark}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    {:else}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    {/if}
  </button>

  <!-- Mobile hamburger -->
  <button class="hamburger" on:click={() => menuOpen = !menuOpen} aria-label="Menu" aria-expanded={menuOpen}>
    {#if menuOpen}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    {:else}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="3" y1="6"  x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    {/if}
  </button>
</nav>

<svelte:window on:keydown={handleKeydown} />

<!-- Mobile dropdown menu -->
{#if menuOpen}
  <nav class="mobile-menu" aria-label="Mobile navigation">
    <a href="/"            class:active={$page.url.pathname === '/'}>Teams</a>
    <a href="/game"        class:active={$page.url.pathname === '/game'}>Game</a>
    <a href="/tiers"       class:active={$page.url.pathname === '/tiers'}>All Tiers</a>
    <a href="/boost-tiers" class:active={$page.url.pathname === '/boost-tiers'}>Boost Tiers</a>
    <a href="/quiz"        class:active={$page.url.pathname === '/quiz'}>Quiz</a>
    <div class="mobile-menu-divider"></div>
    <button class="mobile-theme-btn" on:click={toggleTheme}>
      {#if dark}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        Switch to light mode
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        Switch to dark mode
      {/if}
    </button>
  </nav>
{/if}

<main>
  <slot />
</main>

<Tooltip />

<div class="kofi-banner" role="complementary" aria-label="Support the developer">
  <span class="kofi-desc">Speedcheck is free, no ads, built solo. If it's helped you in a game,</span>
  <a class="kofi-link" href="https://ko-fi.com/T6T21XBBI8" target="_blank" rel="noopener">
    <span class="kofi-cup" aria-hidden="true">☕</span> buy me a coffee on Ko-fi ↗
  </a>
</div>

<style>
  nav {
    position: sticky;
    top: 0;
    z-index: 50;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 1rem;
    padding-left: max(1rem, var(--safe-left));
    padding-right: max(1rem, var(--safe-right));
    height: 52px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 700;
    font-size: 1rem;
    color: var(--text);
    margin-right: auto;
    white-space: nowrap;
    min-height: 44px;
    grid-column: 1;
  }

  .brand-icon {
    width: 28px;
    height: 28px;
    object-fit: contain;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  .nav-links {
    grid-column: 2;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .theme-toggle { grid-column: 3; justify-self: end; }

  nav a {
    color: var(--text-muted);
    font-size: 0.9rem;
    white-space: nowrap;
    min-height: 44px;
    padding: 0 0.5rem;
  }

  nav a:hover { color: var(--text); }
  nav a.active { color: var(--text); font-weight: 600; }

  .theme-toggle {
    margin-left: auto;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    padding: 0 0.6rem;
    min-height: 44px;
    cursor: pointer;
    flex-shrink: 0;
    transition: color 0.15s, border-color 0.15s;
  }
  .theme-toggle:hover { color: var(--text); border-color: var(--text-muted); }

  /* Hamburger — mobile only */
  .hamburger {
    display: none;
    grid-column: 3;
    justify-self: end;
    background: none;
    border: none;
    color: var(--text-muted);
    padding: 0 0.25rem;
    min-height: 44px;
    cursor: pointer;
  }

  /* Mobile menu dropdown */
  .mobile-menu {
    display: none;
    position: sticky;
    top: 52px;
    z-index: 49;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-direction: column;
    padding: 0.5rem 0;
    padding-left: max(1rem, var(--safe-left));
    padding-right: max(1rem, var(--safe-right));
  }

  .mobile-menu a {
    color: var(--text-muted);
    font-size: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border);
    min-height: unset;
  }
  .mobile-menu a:last-of-type { border-bottom: none; }
  .mobile-menu a.active { color: var(--text); font-weight: 600; }

  .mobile-menu-divider {
    height: 1px;
    background: var(--border);
    margin: 0.25rem 0;
  }

  .mobile-theme-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1rem;
    padding: 0.75rem 0;
    cursor: pointer;
    text-align: left;
  }

  @media (max-width: 640px) {
    nav {
      grid-template-columns: 1fr auto;
    }
    .nav-links  { display: none; }
    .theme-toggle { display: none; }
    .hamburger  { display: flex; align-items: center; }
    .mobile-menu { display: flex; }
  }

  main {
    flex: 1;
    padding: 1.5rem 1rem;
    padding-left: max(1rem, var(--safe-left));
    padding-right: max(1rem, var(--safe-right));
    padding-bottom: 1.5rem;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }

  @media (min-width: 600px) {
    main { padding: 2rem 1.5rem 1.5rem; }
  }

  /* Ko-fi banner */
  .kofi-banner {
    border-top: 1px solid var(--border);
    padding: 0.85rem 1rem;
    padding-bottom: max(0.85rem, var(--safe-bottom));
    text-align: center;
    font-size: 0.9rem;
    color: var(--text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
  }

  .kofi-desc { line-height: 1.5; }
  .kofi-cup { font-size: 1.25rem; line-height: 1; }

  .kofi-link {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--accent);
    font-weight: 600;
    font-size: 1rem;
    text-decoration: underline;
    text-underline-offset: 3px;
    min-height: unset;
  }
  .kofi-link:hover { color: var(--accent-hover); }
</style>
