<script lang="ts">
  import '../app.css';
</script>

<nav>
  <a href="/" class="brand">VGC Tools</a>
  <a href="/">Speed Tiers</a>
</nav>

<main>
  <slot />
</main>

<style>
  nav {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  .brand {
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--accent);
    margin-right: auto;
  }

  nav a {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  nav a:hover {
    color: var(--text);
  }

  main {
    padding: 2rem 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }
</style>
