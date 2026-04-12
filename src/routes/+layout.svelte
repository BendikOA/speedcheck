<script lang="ts">
  import "../app.css";
  import { browser, dev } from "$app/environment";
  import { page } from "$app/stores";
  import Tooltip from "$lib/components/Tooltip/index.svelte";
  import { injectAnalytics } from "@vercel/analytics/sveltekit";
  import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";

  injectAnalytics({ mode: dev ? "development" : "production" });
  injectSpeedInsights();

  let dark = true;
  if (browser) {
    const saved = localStorage.getItem("theme");
    dark = saved ? saved === "dark" : true;
    document.documentElement.setAttribute(
      "data-theme",
      dark ? "dark" : "light",
    );
  }

  function toggleTheme() {
    dark = !dark;
    const t = dark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
  }

  let menuOpen = false;
  // Close menu on any navigation or Escape
  $: if ($page.url.pathname) menuOpen = false;
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") menuOpen = false;
  }
</script>

<svelte:head>
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Turnadus",
    url: "https://turnadus.com",
    description:
      "Free Pokémon speed tier and turn order tool for VGC and Pokémon Champions. Build teams, check who goes first, and master speed tiers.",
    applicationCategory: "GameApplication",
    operatingSystem: "Web Browser",
    inLanguage: "en",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    creator: { "@type": "Person", name: "Codaclef" },
  })}</script>`}
</svelte:head>

<nav>
  <div class="nav-inner">
    <a href="/" class="brand">
      <h2 class="brand-name">Turnadus</h2>
    </a>

    <!-- Desktop nav links -->
    <div class="nav-links">
      <a href="/" class:active={$page.url.pathname === "/"}>Teams</a>
      <a href="/game" class:active={$page.url.pathname === "/game"}>Game</a>
      <a href="/tiers" class:active={$page.url.pathname === "/tiers"}>All Tiers</a>
      <!-- <a href="/boost-tiers" class:active={$page.url.pathname === "/boost-tiers"}>Boost Tiers</a> -->
      <a href="/quiz" class:active={$page.url.pathname === "/quiz"}>Quiz</a>
      <!-- <a href="/feedback" class:active={$page.url.pathname === "/feedback"}>Feedback</a> -->
    </div>

  <!-- Desktop theme toggle hidden -->
  <!-- <button class="theme-toggle" on:click={toggleTheme} aria-label="Toggle theme">
    {#if dark}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" /><line
          x1="12"
          y1="21"
          x2="12"
          y2="23"
        />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line
          x1="18.36"
          y1="18.36"
          x2="19.78"
          y2="19.78"
        />
        <line x1="1" y1="12" x2="3" y2="12" /><line
          x1="21"
          y1="12"
          x2="23"
          y2="12"
        />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line
          x1="18.36"
          y1="5.64"
          x2="19.78"
          y2="4.22"
        />
      </svg>
    {:else}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    {/if}
  </button> -->

  <!-- Mobile hamburger -->
  <button
    class="hamburger"
    on:click={() => (menuOpen = !menuOpen)}
    aria-label="Menu"
    aria-expanded={menuOpen}
  >
    {#if menuOpen}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" /><line
          x1="6"
          y1="6"
          x2="18"
          y2="18"
        />
      </svg>
    {:else}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    {/if}
  </button>
  </div>
</nav>

<svelte:window on:keydown={handleKeydown} />

{#if menuOpen}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="drawer-backdrop" on:click={() => (menuOpen = false)}></div>

  <!-- Drawer -->
  <nav class="drawer" aria-label="Mobile navigation">
    <div class="drawer-header">
      <a href="/" class="brand drawer-brand">
        <span class="brand-name">Turnadus</span>
      </a>
      <button
        class="drawer-close"
        on:click={() => (menuOpen = false)}
        aria-label="Close menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" /><line
            x1="6"
            y1="6"
            x2="18"
            y2="18"
          />
        </svg>
      </button>
    </div>

    <div class="drawer-links">
      <a href="/" class:active={$page.url.pathname === "/"}>Teams</a>
      <a href="/game" class:active={$page.url.pathname === "/game"}>Game</a>
      <a href="/tiers" class:active={$page.url.pathname === "/tiers"}
        >All Tiers</a
      >
      <!-- Boost Tiers hidden -->
      <a href="/quiz" class:active={$page.url.pathname === "/quiz"}>Quiz</a>
      <!-- <a href="/feedback" class:active={$page.url.pathname === "/feedback"}>Feedback</a> -->
    </div>

    <div class="drawer-footer">
      <!-- mobile theme toggle hidden -->
      <!-- <button class="mobile-theme-btn" on:click={toggleTheme}>
        {#if dark}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" /><line
              x1="12"
              y1="21"
              x2="12"
              y2="23"
            />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line
              x1="18.36"
              y1="18.36"
              x2="19.78"
              y2="19.78"
            />
            <line x1="1" y1="12" x2="3" y2="12" /><line
              x1="21"
              y1="12"
              x2="23"
              y2="12"
            />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line
              x1="18.36"
              y1="5.64"
              x2="19.78"
              y2="4.22"
            />
          </svg>
          Switch to light mode
        {:else}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          Switch to dark mode
        {/if}
      </button> -->
      <div class="drawer-kofi">
        Turnadus is free, no ads, built solo. If it helped you in a game, <a
          href="https://ko-fi.com/T6T21XBBI8"
          target="_blank"
          rel="noopener">consider buying me a coffee on Ko-fi ☕</a
        >
      </div>
    </div>
  </nav>
{/if}

<main>
  <slot />
</main>

<Tooltip />

<div
  class="kofi-banner"
  role="complementary"
  aria-label="Support the developer"
>
  Turnadus is a solo project and free to use — if it helped, <a
    class="kofi-link"
    href="https://ko-fi.com/T6T21XBBI8"
    target="_blank"
    rel="noopener">buy me a coffee on Ko-fi ☕</a
  >
</div>

<style>
  nav {
    position: sticky;
    top: 0;
    z-index: 50;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }

  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
    height: 52px;
    padding: 0 1rem;
    padding-left: max(1rem, var(--safe-left));
    padding-right: max(1rem, var(--safe-right));
  }

  .brand {
    display: flex;
    align-items: center;
    color: var(--text);
    white-space: nowrap;
    min-height: 44px;
  }

  .brand-name {
    font-family: var(--font-heading);
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text);
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .theme-toggle {
    margin-left: auto;
  }

  nav a {
    color: var(--text-muted);
    font-size: 0.9rem;
    white-space: nowrap;
    min-height: 44px;
    padding: 0 0.5rem;
  }

  nav a:hover {
    color: var(--text);
  }
  nav a.active {
    color: var(--text);
    font-weight: 600;
  }

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
    transition:
      color 0.15s,
      border-color 0.15s;
  }
  .theme-toggle:hover {
    color: var(--text);
    border-color: var(--text-muted);
  }

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

  /* Drawer backdrop */
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: 99;
    background: rgba(0, 0, 0, 0.55);
  }

  /* Drawer panel */
  .drawer {
    position: fixed;
    top: 0;
    left: 0;
    height: 100dvh;
    width: 80vw;
    z-index: 100;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.25rem;
    height: 60px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .drawer-brand {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-height: unset;
  }

  .drawer-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    min-height: 44px;
    min-width: 44px;
    justify-content: center;
  }

  .drawer-links {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .drawer-links a {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 1rem 1.25rem;
    font-size: 1.3rem;
    font-family: var(--font-heading);
    font-weight: 500;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
    min-height: unset;
    transition:
      background 0.1s,
      color 0.1s;
  }
  .drawer-links a:hover {
    background: var(--surface-2);
    color: var(--text);
  }
  .drawer-links a.active {
    color: var(--text);
    font-weight: 700;
  }

  .drawer-footer {
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .mobile-theme-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: none;
    border: none;
    border-bottom: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 1rem;
    padding: 0 1.25rem;
    height: 56px;
    cursor: pointer;
    text-align: left;
    width: 100%;
  }
  .mobile-theme-btn:hover {
    background: var(--surface-2);
    color: var(--text);
  }

  .drawer-kofi {
    padding: 1rem 1.5rem;
    padding-bottom: max(1rem, var(--safe-bottom));
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: center;
    line-height: 1.6;
  }
  .drawer-kofi a {
    color: var(--text);
    font-weight: 600;
    font-size: 0.8rem;
    min-height: unset;
    display: inline;
  }
  .drawer-kofi a:hover {
    color: var(--accent-hover);
  }

  @media (max-width: 640px) {
    nav {
      grid-template-columns: 1fr auto;
    }
    .nav-links {
      display: none;
    }
    .theme-toggle {
      display: none;
    }
    .hamburger {
      display: flex;
      align-items: center;
    }
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
    main {
      padding: 2rem 1.5rem 1.5rem;
    }
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

  @media (min-width: 640px) {
    .kofi-banner {
      flex-direction: row;
      justify-content: center;
      gap: 0.4rem;
    }
  }

  .kofi-link {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--text);
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: underline;
    text-underline-offset: 3px;
    min-height: unset;
  }
  .kofi-link:hover {
    color: var(--text-muted);
  }
</style>
