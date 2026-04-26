<script lang="ts">
  import "../app.scss";
  import { browser, dev } from "$app/environment";
  import Tooltip from "$lib/components/Tooltip/index.svelte";
  import Navbar from "$lib/components/ui/Navbar/index.svelte";
  import { injectAnalytics } from "@vercel/analytics/sveltekit";
  import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit";

  injectAnalytics({ mode: dev ? "development" : "production" });
  injectSpeedInsights();

  if (browser) {
    const saved = localStorage.getItem("theme");
    const dark = saved ? saved === "dark" : true;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }
</script>

<svelte:head>
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Turnadus - Pokémon VGC Companion",
    url: "https://turnadus.com",
    description:
      "Free Pokémon speed tier and turn order tool for VGC and Pokémon Champions. All in one ingame companion, teambuilder, meta analysis, speed tiers.",
    applicationCategory: "GameApplication",
    operatingSystem: "Web Browser",
    inLanguage: "en",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    creator: { "@type": "Person", name: "Codaclef" },
  })}</script>`}
</svelte:head>

<Navbar />

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
