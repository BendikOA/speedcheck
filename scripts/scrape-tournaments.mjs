#!/usr/bin/env node
/**
 * Fetches top-10 teams from Reg M-A VGC online tournaments via the Limitless API,
 * then aggregates per-pokemon move/ability/item usage into champions-meta.json.
 *
 * API docs: https://docs.limitlesstcg.com/developer/tournaments
 * No API key required.
 *
 * Outputs:
 *   static/champions-meta.json  — aggregated per-pokemon usage
 *
 * Run: node scripts/scrape-tournaments.mjs
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir  = dirname(fileURLToPath(import.meta.url));
const OUT    = resolve(__dir, '../static/champions-meta.json');

const BASE_URL     = 'https://play.limitlesstcg.com/api';
const GAME         = 'VGC';
const FORMAT       = 'M-A';
const TOP_N        = 10;    // top placements to capture per tournament
const MAX_TOURNEYS = 100;   // upper cap — will use however many exist
const MIN_PLAYERS  = 16;    // skip tiny side events
const DELAY_MS     = 600;   // polite delay between requests

const HEADERS = {
  'User-Agent': 'speedcheck-vgc-tool/1.0 (open-source, daily aggregator)',
  'Accept':     'application/json',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function api(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${BASE_URL}${path}`);
  return res.json();
}

// ─── Aggregator ──────────────────────────────────────────────────────────────

function inc(obj, key) {
  if (!key) return;
  obj[key] = (obj[key] ?? 0) + 1;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function scrape() {
  // 1. Collect all Reg M-A tournaments (paginate if needed)
  console.log(`Fetching all ${FORMAT} tournaments…`);
  let page = 1;
  const allTourneys = [];

  while (allTourneys.length < MAX_TOURNEYS) {
    const batch = await api(`/tournaments?game=${GAME}&format=${FORMAT}&limit=50&page=${page}`);
    if (!batch.length) break;
    allTourneys.push(...batch);
    if (batch.length < 50) break; // last page
    page++;
    await sleep(DELAY_MS);
  }

  const eligible = allTourneys.filter(t => t.players >= MIN_PLAYERS);
  console.log(`${allTourneys.length} total → ${eligible.length} with ≥${MIN_PLAYERS} players\n`);

  // 2. Per-pokemon aggregation maps
  // pokemonStats[id] = { usage, moves: {name: count}, abilities: {name: count}, items: {name: count} }
  const pokemonStats = {};

  let tournamentCount = 0;
  let teamSlots       = 0;

  for (const t of eligible) {
    const date = t.date.slice(0, 10);
    process.stdout.write(`  [${++tournamentCount}/${eligible.length}] ${t.name.slice(0, 50).padEnd(50)} `);
    await sleep(DELAY_MS);

    try {
      const standings = await api(`/tournaments/${t.id}/standings?limit=100`);

      const top = standings
        .filter(p => p.placing && p.decklist?.length === 6)
        .sort((a, b) => a.placing - b.placing)
        .slice(0, TOP_N);

      for (const player of top) {
        for (const pk of player.decklist) {
          const id = pk.id;
          if (!id) continue;

          if (!pokemonStats[id]) {
            pokemonStats[id] = { usage: 0, moves: {}, abilities: {}, items: {} };
          }

          pokemonStats[id].usage++;
          teamSlots++;

          for (const move of pk.attacks ?? []) inc(pokemonStats[id].moves, move);
          inc(pokemonStats[id].abilities, pk.ability);
          inc(pokemonStats[id].items, pk.item);
        }
      }

      process.stdout.write(`${top.length} teams\n`);
    } catch (err) {
      process.stdout.write(`FAILED: ${err.message}\n`);
    }
  }

  // 3. Sort each pokemon's data by count descending
  for (const stats of Object.values(pokemonStats)) {
    stats.moves     = sortDesc(stats.moves);
    stats.abilities = sortDesc(stats.abilities);
    stats.items     = sortDesc(stats.items);
  }

  // 4. Sort pokemon by usage descending
  const sortedPokemon = Object.fromEntries(
    Object.entries(pokemonStats).sort((a, b) => b[1].usage - a[1].usage)
  );

  const output = {
    updated:     new Date().toISOString().slice(0, 10),
    source:      'play.limitlesstcg.com/api',
    format:      FORMAT,
    meta: {
      tournaments: tournamentCount,
      teamSlots,
      pokemonCount: Object.keys(sortedPokemon).length,
    },
    pokemon: sortedPokemon,
  };

  writeFileSync(OUT, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${OUT}`);
  console.log(`${tournamentCount} tournaments · ${teamSlots} pokemon appearances · ${Object.keys(sortedPokemon).length} unique pokemon`);
}

function sortDesc(obj) {
  return Object.fromEntries(
    Object.entries(obj).sort((a, b) => b[1] - a[1])
  );
}

scrape().catch(err => { console.error(err); process.exit(1); });
