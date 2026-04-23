<script lang="ts">
  import './styles.scss';
  import { iconStyle } from '$lib/sprites';
  import { savedTeams } from '$lib/stores/savedTeams';
  import Button from '$lib/components/ui/Button/index.svelte';
  import type { TournamentTeam, TournamentPokemon } from '$lib/types/recentTeams';

  export let tournamentName: string;
  export let tournamentDate: string;
  export let players: number;
  export let team: TournamentTeam;

  let expanded = false;
  let saved = false;
  let copied = false;

  function toggleExpand() { expanded = !expanded; }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function placingLabel(n: number): string {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return `${n}th`;
  }

  function generatePaste(pokemon: TournamentPokemon[]): string {
    return pokemon.map(pk => {
      const lines: string[] = [];
      lines.push(pk.item ? `${pk.name} @ ${pk.item}` : pk.name);
      if (pk.ability) lines.push(`Ability: ${pk.ability}`);
      lines.push(`Level: 50`);
      if (pk.tera) lines.push(`Tera Type: ${pk.tera}`);
      for (const move of pk.moves ?? []) {
        if (move) lines.push(`- ${move}`);
      }
      return lines.join('\n');
    }).join('\n\n');
  }

  async function copyPaste() {
    const text = generatePaste(team.pokemon);
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  function saveTeam() {
    savedTeams.save({
      label: `${team.player} @ ${tournamentName.replace(/^the /i, '').slice(0, 30)}`,
      genNum: 9,
      yourTeam: team.pokemon.map(pk => ({
        id:       pk.id,
        name:     pk.name,
        scarf:    false,
        nature:   '=' as const,
        item:     pk.item ?? undefined,
        ability:  pk.ability ?? undefined,
        teraType: pk.tera ?? undefined,
        moves:    pk.moves ?? [],
      })),
    });
    saved = true;
    setTimeout(() => (saved = false), 2000);
  }
</script>

<div class="tc-card" class:expanded>
  <button class="tc-header" on:click={toggleExpand} aria-expanded={expanded}>

    <!--
      .tc-meta holds all text — stacks vertically on both mobile and desktop.
      On desktop it sits in a flex row next to the sprites.
    -->
    <div class="tc-meta">
      <div class="tc-player-block">
        <span class="tc-placing">{placingLabel(team.placement)}</span>
        <span class="tc-player">{team.player}</span>
        {#if team.country}
          <span class="tc-country">{team.country}</span>
        {/if}
      </div>
      <div class="tc-tourney">
        <span class="tc-tourney-name">{tournamentName}</span>
        <span class="tc-tourney-meta">{formatDate(tournamentDate)} · {players} players</span>
      </div>
    </div>

    <!-- Sprites — own row on mobile, right column on desktop -->
    <div class="tc-sprites">
      {#each team.pokemon as pk}
        <span
          style={iconStyle(pk.name)}
          class="tc-sprite"
          role="img"
          aria-label={pk.name}
          title={pk.name}
        ></span>
      {/each}
    </div>

    <!-- Chevron — absolutely positioned, never affects flow -->
    <svg class="tc-chevron" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>

  </button>

  {#if expanded}
    <div class="tc-details">
      <div class="tc-pokemon-grid">
        {#each team.pokemon as pk}
          <div class="tc-pokemon">
            <div class="tc-pokemon-header">
              <span
                style={iconStyle(pk.name)}
                class="tc-sprite"
                role="img"
                aria-label={pk.name}
              ></span>
              <div class="tc-pokemon-name-block">
                <span class="tc-pokemon-name">{pk.name}</span>
                {#if pk.tera}
                  <span class="tc-tera">Tera: {pk.tera}</span>
                {/if}
              </div>
            </div>
            {#if pk.item || pk.ability}
              <div class="tc-pokemon-meta">
                {#if pk.item}<span class="tc-detail-line">@ {pk.item}</span>{/if}
                {#if pk.ability}<span class="tc-detail-line tc-ability">{pk.ability}</span>{/if}
              </div>
            {/if}
            {#if pk.moves?.length}
              <ul class="tc-moves">
                {#each pk.moves as move}
                  {#if move}<li>{move}</li>{/if}
                {/each}
              </ul>
            {/if}
          </div>
        {/each}
      </div>

      <div class="tc-actions">
        <Button variant="secondary" size="sm" onClick={copyPaste}>
          {copied ? 'Copied!' : 'Copy Pokepaste'}
        </Button>
        <Button variant="primary" size="sm" onClick={saveTeam}>
          {saved ? 'Saved!' : 'Save to My Teams'}
        </Button>
      </div>
    </div>
  {/if}
</div>
