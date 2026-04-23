<script lang="ts">
  import { savedTeams } from '$lib/stores/savedTeams';
  import SavedTeamCard from '$lib/components/ui/SavedTeamCard/index.svelte';
  import TournamentTeamCard from '$lib/components/ui/TournamentTeamCard/index.svelte';
  import type { RecentTeamsData, RecentTournament, TournamentTeam } from '$lib/types/recentTeams';

  export let data: { recentTeams: RecentTeamsData | null };

  $: recentTeams = data.recentTeams;

  interface TournamentWinner {
    tournament: RecentTournament;
    team: TournamentTeam;
  }

  $: tournamentWinners = (recentTeams?.tournaments ?? []).reduce<TournamentWinner[]>((acc, t) => {
    const team = t.teams.find(tm => tm.placement === 1) ?? t.teams[0];
    if (team) acc.push({ tournament: t, team });
    return acc;
  }, []);
</script>

<svelte:head>
  <title>Tournament Teams — Turnadus | Pokémon Champions &amp; VGC</title>
  <meta name="description" content="Top tournament winning teams for Pokémon Champions and VGC. See what the best players bring, and manage your own saved teams." />
  <link rel="canonical" href="https://turnadus.com/teams" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Tournament Teams — Turnadus" />
  <meta property="og:description" content="Top tournament winning teams for Pokémon Champions and VGC. See what the best players bring, and manage your own saved teams." />
  <meta property="og:url" content="https://turnadus.com/teams" />
  <meta property="og:image" content="https://turnadus.com/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Tournament Teams — Turnadus" />
  <meta name="twitter:description" content="Top tournament winning teams for Pokémon Champions and VGC. See what the best players bring, and manage your own saved teams." />
  <meta name="twitter:image" content="https://turnadus.com/og-image.png" />
</svelte:head>

<div class="teams-page">

  <!-- ── Tournament Teams ──────────────────────────────── -->
  <section class="teams-section">
    <div class="section-header">
      <h2 class="section-title">Top Tournament Teams</h2>
      {#if recentTeams}
        <span class="section-meta">
          Winners from the {tournamentWinners.length} most recent tournaments · updated {recentTeams.updated}
        </span>
      {/if}
    </div>

    {#if !recentTeams}
      <p class="teams-empty">No tournament data available yet.</p>
    {:else if tournamentWinners.length === 0}
      <p class="teams-empty">No tournaments found.</p>
    {:else}
      <div class="teams-list">
        {#each tournamentWinners as { tournament, team }}
          <TournamentTeamCard
            tournamentName={tournament.name}
            tournamentDate={tournament.date}
            players={tournament.players}
            {team}
          />
        {/each}
      </div>
    {/if}
  </section>

  <!-- ── Your Saved Teams ──────────────────────────────────── -->
  <section class="saved-section">
    <div class="section-header">
      <h2 class="section-title">Your Saved Teams</h2>
    </div>

    {#if $savedTeams.length === 0}
      <p class="teams-empty">No saved teams yet. Build a team on the <a href="/">home page</a>.</p>
    {:else}
      <div class="saved-list">
        {#each $savedTeams as team (team.id)}
          <SavedTeamCard {team} on:load={() => {}} />
        {/each}
      </div>
    {/if}
  </section>

</div>
