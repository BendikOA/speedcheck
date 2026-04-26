<script lang="ts">
  import './styles.scss';
  import type { SpeedEntry } from '$lib/speedtiers';
  import { spriteUrl } from '$lib/sprites';

  export interface SpeedRow {
    side: 'you' | 'opp';
    entry: SpeedEntry;
    speed: number;
    scarf: boolean;
  }

  export let entries: SpeedRow[] = [];
  export let yourColor: string = 'var(--color-primary)';
  export let oppColor: string = '#fd7949';
</script>

<div class="speed-order">
  <div class="speed-order-header">SPEED ORDER</div>
  {#each entries as row}
    <div class="speed-order-row">
      <div class="speed-order-left">
        <div
          class="speed-order-accent"
          style="background: {row.side === 'you' ? yourColor : oppColor}"
        ></div>
        <img
          class="speed-order-sprite"
          src={spriteUrl(row.entry.name)}
          alt={row.entry.name}
        />
        <span class="speed-order-name">{row.entry.name}</span>
      </div>
      <span class="speed-order-speed">{row.speed}</span>
    </div>
  {/each}
</div>
