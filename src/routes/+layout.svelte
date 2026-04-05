<script lang="ts">
  import '../app.css';
  import { browser, dev } from '$app/environment';
  import Tooltip from '$lib/components/Tooltip.svelte';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';

  injectAnalytics({ mode: dev ? 'development' : 'production' });

  let dark = true;
  if (browser) {
    const saved = localStorage.getItem('theme');
    dark = saved ? saved === 'dark' : true;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  function toggleTheme() {
    dark = !dark;
    const t = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
  }
</script>

<nav>
  <a href="/" class="brand">
    <img src="https://play.pokemonshowdown.com/sprites/itemicons/quick-ball.png" alt="" class="brand-icon" />
    Speedcheck
  </a>
  <div class="nav-links">
    <a href="/">Teams</a>
    <a href="/game">Game</a>
    <a href="/tiers">All Tiers</a>
    <a href="/boost-tiers">Boost Tiers</a>
    <a href="/quiz">Quiz</a>
  </div>
  <button class="theme-toggle" on:click={toggleTheme} aria-label="Toggle theme" title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
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
</nav>

<main>
  <slot />
</main>

<Tooltip />

<div class="kofi-banner" role="complementary" aria-label="Support the developer">
  <span class="kofi-desc">Speedcheck is free, no ads, built solo. If it's helped you in a game,</span>
  <a class="kofi-link" href="https://ko-fi.com/T6T21XBBI8" target="_blank" rel="noopener">
    <span class="kofi-cup">☕</span> buy me a coffee on Ko-fi ↗
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
    color: var(--accent);
    margin-right: auto;
    white-space: nowrap;
    min-height: 44px;
  }

  .brand-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  .brand { grid-column: 1; }

  .nav-links {
    grid-column: 2;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .nav-links::-webkit-scrollbar { display: none; }

  .theme-toggle { grid-column: 3; justify-self: end; }

  nav a {
    color: var(--text-muted);
    font-size: 0.9rem;
    white-space: nowrap;
    min-height: 44px;
    padding: 0 0.5rem;
  }

  nav a:hover { color: var(--text); }

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

  .theme-toggle:hover {
    color: var(--text);
    border-color: var(--text-muted);
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
  }
  .kofi-link:hover { color: var(--accent-hover); }
</style>
