<script context="module" lang="ts">
  import type { SpeedEntry } from '$lib/speedtiers';

  export interface SpeedRow {
    side: 'you' | 'opp';
    entry: SpeedEntry;
    speed: number;
    scarf: boolean;
  }
</script>

<script lang="ts">
  import './styles.scss';
  import { staticSpriteUrl } from '$lib/sprites';

  export let entries: SpeedRow[] = [];
</script>

<div class="speed-order">
  <div class="speed-order-header">Speed Order</div>
  {#each entries as row}
    <div class="speed-order-row {row.side}">
      <div class="speed-order-left">
        <div class="speed-order-sprite-wrap">
          <img
            class="speed-order-sprite"
            src={staticSpriteUrl(row.entry.name)}
            alt={row.entry.name}
          />
        </div>
        <span class="speed-order-name">{row.entry.name}</span>
      </div>
      <span class="speed-order-speed">{row.speed}</span>
    </div>
  {/each}
</div>
