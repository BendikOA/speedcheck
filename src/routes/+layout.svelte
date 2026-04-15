<script lang="ts">
  import "../app.css";
  import "./layout.css";
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
      <h2 class="brand-name">TURNADUS</h2>
    </a>

    <!-- Desktop nav links -->
    <div class="nav-links">
      <a href="/" class:active={$page.url.pathname === "/"}>Builder</a>
      <a href="/teams" class:active={$page.url.pathname === "/teams"}>Teams</a>
      <a href="/meta" class:active={$page.url.pathname === "/meta"}>Meta</a>
      <a href="/game" class:active={$page.url.pathname === "/game"}>Game</a>
      <a href="/tiers" class:active={$page.url.pathname === "/tiers"}
        >All Tiers</a
      >
      <!-- <a href="/boost-tiers" class:active={$page.url.pathname === "/boost-tiers"}>Boost Tiers</a> -->
      <!-- <a href="/quiz" class:active={$page.url.pathname === "/quiz"}>Quiz</a> -->
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
      <a href="/" class:active={$page.url.pathname === "/"}>Builder</a>
      <a href="/teams" class:active={$page.url.pathname === "/teams"}>Teams</a>
      <a href="/meta" class:active={$page.url.pathname === "/meta"}>Meta</a>
      <a href="/game" class:active={$page.url.pathname === "/game"}>Game</a>
      <a href="/tiers" class:active={$page.url.pathname === "/tiers"}
        >All Tiers</a
      >
      <!-- Boost Tiers hidden -->
     <!--  <a href="/quiz" class:active={$page.url.pathname === "/quiz"}>Quiz</a> -->
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

