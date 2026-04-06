<script lang="ts">
  import { onMount } from 'svelte';
  import { buildSpeedTiers, buildAllTiers, GEN_NUMBERS } from '$lib/speedtiers';
  import type { GenNumber, SpeedEntry } from '$lib/speedtiers';
  import { spriteUrl } from '$lib/sprites';
  import { loadSmogonOrder } from '$lib/smogonUsage';

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

<svelte:head><title>Speed Quiz — Speedcheck</title></svelte:head>

<div class="page">
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
          {#if a.nature !== '='}<span class="pill nature-pill" class:pos={a.nature === '+'} class:neg={a.nature === '-'}>{a.nature === '+' ? '+Spe' : '−Spe'}</span>{/if}
          {#if a.scarf}<span class="pill scarf-pill">Scarf</span>{/if}
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
          {#if b.nature !== '='}<span class="pill nature-pill" class:pos={b.nature === '+'} class:neg={b.nature === '-'}>{b.nature === '+' ? '+Spe' : '−Spe'}</span>{/if}
          {#if b.scarf}<span class="pill scarf-pill">Scarf</span>{/if}
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

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 640px;
    margin: 0 auto;
  }

  .empty-notice {
    color: var(--text-muted);
    font-size: 0.9rem;
    text-align: center;
    padding: 2rem 0;
  }

  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .title {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 0.1rem;
  }

  .subtitle {
    font-size: 0.88rem;
    color: var(--text-muted);
  }

  .stats-box {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .stat { font-size: 0.85rem; color: var(--text-muted); }
  .stat-val { font-weight: 700; color: var(--text); }
  .streak { font-size: 0.9rem; font-weight: 700; color: var(--accent); }

  .gen-tabs {
    display: flex;
    gap: 0.25rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 2px;
  }
  .gen-tabs::-webkit-scrollbar { display: none; }

  .gen-tab {
    padding: 0 0.85rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.85rem;
    white-space: nowrap;
    flex-shrink: 0;
    min-height: 44px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .gen-tab.active {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  }

  .options {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .opt-toggle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0 0.85rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.85rem;
    cursor: pointer;
    min-height: 44px;
    user-select: none;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .opt-toggle input { display: none; }
  .opt-toggle.active {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  }

  /* Question */
  .question {
    display: flex;
    gap: 1rem;
    align-items: stretch;
  }

  @media (max-width: 480px) {
    .question { flex-direction: column; }
    .vs { align-self: center; }
  }

  .choice {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.5rem 1rem;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    min-height: 160px;
    transition: border-color 0.15s, background 0.15s;
    position: relative;
  }

  @media (hover: hover) {
    .choice:not(:disabled):hover {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 6%, var(--surface));
    }
  }

  .choice:active:not(:disabled) { opacity: 0.85; }
  .choice:disabled { cursor: default; }

  .choice.correct {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 10%, var(--surface));
  }
  .choice.wrong {
    border-color: var(--danger);
    background: color-mix(in srgb, var(--danger) 8%, var(--surface));
  }
  .choice.reveal-correct {
    border-color: var(--success);
    opacity: 0.6;
  }

  .sprite {
    width: 80px;
    height: 80px;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .pname {
    font-size: 0.95rem;
    font-weight: 600;
    text-align: center;
    color: var(--text);
  }

  .pills {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .pill {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.15rem 0.45rem;
    border-radius: 100px;
    border: 1px solid;
  }
  .nature-pill.pos { color: #6c8ef5; border-color: #6c8ef5; }
  .nature-pill.neg { color: #f56c6c; border-color: #f56c6c; }
  .scarf-pill { color: #f5c96c; border-color: #f5c96c; }

  .reveal-speed {
    position: absolute;
    bottom: 0.6rem;
    right: 0.75rem;
    font-size: 1.1rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
  }
  .choice.correct .reveal-speed { color: var(--success); }

  .vs {
    display: flex;
    align-items: center;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .tie-btn {
    align-self: center;
    padding: 0 1.5rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.9rem;
    cursor: pointer;
    min-height: 44px;
    transition: border-color 0.15s, color 0.15s;
  }
  @media (hover: hover) {
    .tie-btn:hover { color: var(--text); border-color: var(--text-muted); }
  }

  .result {
    text-align: center;
    font-size: 1rem;
    font-weight: 600;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
  }
  .result-correct { color: var(--success); background: color-mix(in srgb, var(--success) 10%, var(--surface)); }
  .result-wrong   { color: var(--danger);  background: color-mix(in srgb, var(--danger)  8%,  var(--surface)); }

  .next-btn {
    align-self: center;
    padding: 0 2rem;
    background: var(--accent);
    border: none;
    border-radius: var(--radius-sm);
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 52px;
    transition: background 0.15s;
  }
  .next-btn:hover { background: var(--accent-hover); }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .best-streak {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .reset-btn {
    padding: 0 0.85rem;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.82rem;
    cursor: pointer;
    min-height: 44px;
    transition: color 0.15s, border-color 0.15s;
  }
  @media (hover: hover) {
    .reset-btn:hover { color: var(--danger); border-color: var(--danger); }
  }
</style>
