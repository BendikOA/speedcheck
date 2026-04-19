<script lang="ts">
  export let title: string;
  export let items: { name: string; pct: number; [key: string]: unknown }[];
  export let rowClass: string = '';
  export let emptyText: string = 'No data available.';
</script>

<section class="detail-section">
  <h2 class="detail-section-title">{title}</h2>
  {#if items.length === 0}
    <p class="no-data">{emptyText}</p>
  {:else}
    <div class="usage-rows">
      {#each items as item}
        <div class="usage-row {rowClass}">
          <div class="usage-row-bar" style="width: {Math.min(item.pct, 100)}%"></div>
          <slot {item} />
          <span class="usage-row-name">{item.name}</span>
          <span class="usage-row-pct">{item.pct}%</span>
        </div>
      {/each}
    </div>
  {/if}
</section>
