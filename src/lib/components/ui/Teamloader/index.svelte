<script lang="ts">
  import './styles.scss';
  import { createEventDispatcher } from 'svelte';
  import { staticSpriteUrl } from '$lib/sprites';
  import type { SavedTeam } from '$lib/stores/savedTeams';
  import Button from '$lib/components/ui/Button/index.svelte';

  export let team: SavedTeam;
  export let active = false;

  const dispatch = createEventDispatcher<{ load: SavedTeam }>();
</script>

<div class="teamloader" class:active>
  <div class="teamloader-top">
    <div class="teamloader-meta">
      <span class="teamloader-name">{team.label}</span>
      <span class="teamloader-sub">Gen {team.genNum}</span>
    </div>
    <Button variant="brand" size="sm" onClick={() => dispatch('load', team)}>Load</Button>
  </div>

  <div class="teamloader-sprites">
    {#each Array(6) as _, i}
      <div class="teamloader-sprite-wrap">
        {#if team.yourTeam[i]}
          <img
            class="teamloader-sprite"
            src={staticSpriteUrl(team.yourTeam[i]!.name)}
            alt={team.yourTeam[i]!.name}
            title={team.yourTeam[i]!.name}
            loading="lazy"
          />
        {/if}
      </div>
    {/each}
  </div>
</div>
