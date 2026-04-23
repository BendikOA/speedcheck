<script lang="ts">
  import { onMount } from 'svelte';
  import { buildSpeedTiers, buildAllTiers, GEN_NUMBERS } from '$lib/speedtiers';
  import type { GenNumber, SpeedEntry } from '$lib/speedtiers';
  import { spriteUrl } from '$lib/sprites';
  import { loadSmogonOrder } from '$lib/smogonUsage';
  import Pill from '$lib/components/ui/Pill/index.svelte';

  // ── Settings ──────────────────────────────────────────────────────────────
  let selectedGen: GenNumber | null = null;
  let withScarf    = false;
  let withNatures  = false;

  let usageOrder: string[] = [];

  onMount(async () => {
    usageOrder = await loadSmogonOrder(9);
  });

  $: allEntries  = selectedGen ? buildSpeedTiers(selectedGen) : buildAllTiers(9);

  // Filter to Smogon usage top-100 when available, otherwise all entries
  $: pool = (() => {
    if (usageOrder.length === 0) return allEntries;
    const usageSet = new Set(usageOrder.slice(0, 150));
    const filtered = allEntries.filter(e => usageSet.has(e.id));
    return filtered.length >= 10 ? filtered : allEntries;
  })();

  // ── Stats ─────────────────────────────────────────────────────────────────
  let correct   = 0;
  let incorrect = 0;
  let streak    = 0;
  let bestStreak = 0;

  // ── Question state ────────────────────────────────────────────────────────
  type QuizPoke = {
    entry:   SpeedEntry;
    nature:  '+' | '=' | '-';
    scarf:   boolean;
    speed:   number;
  };

  let a: QuizPoke | null = null;
  let b: QuizPoke | null = null;
  let answered: 'a' | 'b' | 'tie' | null = null;
  let correct_answer: 'a' | 'b' | 'tie' | null = null;

  function natureSpeed(entry: SpeedEntry, nature: '+' | '=' | '-'): number {
    return nature === '+' ? entry.maxSpeed : nature === '=' ? entry.neutralSpeed : entry.minSpeed;
  }

  function makeQuizPoke(entry: SpeedEntry): QuizPoke {
    const nature: '+' | '=' | '-' = withNatures
      ? (['+', '=', '-'] as const)[Math.floor(Math.random() * 3)]
      : '=';
    const scarf = withScarf && Math.random() < 0.25;
    const base  = natureSpeed(entry, nature);
    const speed = scarf ? Math.floor(base * 1.5) : base;
    return { entry, nature, scarf, speed };
  }

  function newQuestion() {
    if (pool.length < 2) return;
    answered = null;
    correct_answer = null;

    // Pick 2 distinct Pokémon — re-pick if speeds are suspiciously close to avoid
    // impossible-looking ties when we haven't randomised natures
    let attempts = 0;
    do {
      const idxA = Math.floor(Math.random() * pool.length);
      let idxB   = Math.floor(Math.random() * pool.length);
      while (idxB === idxA) idxB = Math.floor(Math.random() * pool.length);
      a = makeQuizPoke(pool[idxA]);
      b = makeQuizPoke(pool[idxB]);
      attempts++;
    } while (attempts < 10 && !withNatures && a!.speed === b!.speed);

    correct_answer = a!.speed > b!.speed ? 'a'
                   : b!.speed > a!.speed ? 'b'
                   : 'tie';
  }

  function answer(pick: 'a' | 'b' | 'tie') {
    if (answered !== null) return;
    answered = pick;
    if (pick === correct_answer) {
      correct++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      incorrect++;
      streak = 0;
    }
  }

  function reset() {
    correct = incorrect = streak = 0;
    newQuestion();
  }

  // Start immediately
  $: if (pool.length >= 2 && a === null) newQuestion();

  async function changeGen(g: GenNumber | null) {
    selectedGen = g;
    usageOrder = await loadSmogonOrder(g ?? 9);
    a = null; // triggers reactive newQuestion
  }

  $: total     = correct + incorrect;
  $: winPct    = total > 0 ? Math.round((correct / total) * 100) : 0;
</script>

<svelte:head><title>Speed Quiz — Turnadus</title></svelte:head>

<div class="quiz-page">
  <div class="header">
    <div>
      <h1 class="title">Speed Quiz</h1>
      <p class="subtitle">Which Pokémon is faster?</p>
    </div>
    <div class="stats-box">
      <span class="stat"><span class="stat-val">{correct}</span> correct</span>
      <span class="stat"><span class="stat-val">{incorrect}</span> wrong</span>
      {#if total > 0}
        <span class="stat"><span class="stat-val">{winPct}%</span></span>
      {/if}
      {#if streak >= 3}
        <span class="streak"><span aria-hidden="true">🔥</span> {streak} streak</span>
      {/if}
    </div>
  </div>

  <!-- Gen filter -->
  <div class="gen-tabs scroll-x">
    <button class="gen-tab" class:active={selectedGen === null} on:click={() => changeGen(null)}>All</button>
    {#each GEN_NUMBERS as g}
      <button class="gen-tab" class:active={selectedGen === g} on:click={() => changeGen(g)}>Gen {g}</button>
    {/each}
  </div>

  <!-- Options -->
  <div class="options">
    <label class="opt-toggle" class:active={withNatures}>
      <input type="checkbox" bind:checked={withNatures} on:change={() => { a = null; }} />
      Random natures
    </label>
    <label class="opt-toggle" class:active={withScarf}>
      <input type="checkbox" bind:checked={withScarf} on:change={() => { a = null; }} />
      Random scarfs
    </label>
  </div>

  <!-- Question card -->
  {#if pool.length < 2}
    <p class="empty-notice">Not enough Pokémon in the pool for this gen/filter combination.</p>
  {:else if a && b}
    <div class="question">
      <!-- A -->
      <button
        class="choice"
        class:correct={answered && answered === 'a' && correct_answer === 'a'}
        class:wrong={answered && answered === 'a' && correct_answer !== 'a'}
        class:reveal-correct={answered && answered !== 'a' && correct_answer === 'a'}
        disabled={answered !== null}
        on:click={() => answer('a')}
      >
        <img src={spriteUrl(a.entry.name)} alt={a.entry.name} class="sprite" />
        <span class="pname">{a.entry.name}</span>
        <div class="pills">
          {#if a.nature !== '='}<Pill color={a.nature === '+' ? 'var(--accent-2)' : '#c94040'}>{a.nature === '+' ? '+Spe' : '−Spe'}</Pill>{/if}
          {#if a.scarf}<Pill color="#f5c96c" variant="alt">Scarf</Pill>{/if}
        </div>
        {#if answered}
          <span class="reveal-speed">{a.speed}</span>
        {/if}
      </button>

      <div class="vs">VS</div>

      <!-- B -->
      <button
        class="choice"
        class:correct={answered && answered === 'b' && correct_answer === 'b'}
        class:wrong={answered && answered === 'b' && correct_answer !== 'b'}
        class:reveal-correct={answered && answered !== 'b' && correct_answer === 'b'}
        disabled={answered !== null}
        on:click={() => answer('b')}
      >
        <img src={spriteUrl(b.entry.name)} alt={b.entry.name} class="sprite" />
        <span class="pname">{b.entry.name}</span>
        <div class="pills">
          {#if b.nature !== '='}<Pill color={b.nature === '+' ? 'var(--accent-2)' : '#c94040'}>{b.nature === '+' ? '+Spe' : '−Spe'}</Pill>{/if}
          {#if b.scarf}<Pill color="#f5c96c">Scarf</Pill>{/if}
        </div>
        {#if answered}
          <span class="reveal-speed">{b.speed}</span>
        {/if}
      </button>
    </div>

    <!-- Tie button -->
    {#if !answered}
      <button class="tie-btn" on:click={() => answer('tie')}>They tie</button>
    {/if}

    <!-- Result + next -->
    {#if answered}
      <div class="result" class:result-correct={answered === correct_answer} class:result-wrong={answered !== correct_answer}>
        {#if answered === correct_answer}
          ✓ Correct!
        {:else if correct_answer === 'tie'}
          ✗ Wrong — they actually tie at {a.speed}!
        {:else}
          ✗ Wrong — {correct_answer === 'a' ? a.entry.name : b.entry.name} is faster ({correct_answer === 'a' ? a.speed : b.speed} vs {correct_answer === 'a' ? b.speed : a.speed})
        {/if}
      </div>
      <button class="next-btn" on:click={newQuestion}>Next →</button>
    {/if}
  {/if}

  <!-- Best streak + reset -->
  {#if total > 0}
    <div class="footer">
      {#if bestStreak >= 3}<span class="best-streak">Best streak: {bestStreak}</span>{/if}
      <button class="reset-btn" on:click={reset}>Reset score</button>
    </div>
  {/if}
</div>

