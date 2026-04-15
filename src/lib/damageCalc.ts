import { Pokemon, Move, Field, Side, calculate, Generations } from '@smogon/calc';
import type { TeamSlot } from '$lib/stores/teams';
import type { Conditions } from '$lib/speedtiers';

export interface CalcMoveResult {
  moveName: string;
  minPct: number;
  maxPct: number;
  /** Minimum guaranteed hits to KO (1 = OHKO, 2 = 2HKO, etc.) */
  nHko: number;
  /** True if min damage guarantees a KO in nHko hits */
  guaranteed: boolean;
  desc: string;
}

export interface CalcSide {
  slot: NonNullable<TeamSlot>;
  side: 'you' | 'opp';
  hasImportedEVs: boolean;
  moves: CalcMoveResult[];
}

const GEN = Generations.get(9);

function buildCalcField(cond: Conditions, attackerSide: 'you' | 'opp'): Field {
  const weather =
    cond.rain ? 'Rain' :
    cond.sun  ? 'Sun'  :
    cond.sand ? 'Sand' :
    cond.snow ? 'Snow' : undefined;
  const terrain =
    cond.electric ? 'Electric' :
    cond.grassy   ? 'Grassy'   :
    cond.psychic  ? 'Psychic'  : undefined;

  const yourSide = new Side({ isTailwind: !!cond.yourTailwind });
  const oppSide  = new Side({ isTailwind: !!cond.oppTailwind  });

  return new Field({
    gameType: 'Doubles',
    weather: weather as any,
    terrain: terrain as any,
    attackerSide: attackerSide === 'you' ? yourSide : oppSide,
    defenderSide: attackerSide === 'you' ? oppSide  : yourSide,
  });
}

function buildCalcPokemon(slot: NonNullable<TeamSlot>): Pokemon {
  const level = slot.level ?? 50;
  // EVs: use imported data when available; otherwise no EV investment (conservative)
  const evs = slot.evs
    ? { hp: slot.evs.hp, atk: slot.evs.atk, def: slot.evs.def, spa: slot.evs.spa, spd: slot.evs.spd, spe: slot.evs.spe }
    : undefined;
  const ivs = slot.ivs
    ? { hp: slot.ivs.hp, atk: slot.ivs.atk, def: slot.ivs.def, spa: slot.ivs.spa, spd: slot.ivs.spd, spe: slot.ivs.spe }
    : undefined;

  return new Pokemon(GEN, slot.entry.name, {
    level,
    // We only track speed nature; use Serious (neutral) for atk/def stats
    nature: 'Serious',
    item:     (slot.item     ?? undefined) as any,
    ability:  (slot.ability  ?? slot.entry.abilities[0] ?? undefined) as any,
    teraType: (slot.teraType ?? undefined) as any,
    evs,
    ivs,
  });
}

function nHkoFromPct(minPct: number, maxPct: number): { nHko: number; guaranteed: boolean } {
  // guaranteed NHKO means even minimum roll is enough
  for (const n of [1, 2, 3, 4, 5, 6]) {
    if (minPct * n >= 100) return { nHko: n, guaranteed: true };
    if (maxPct * n >= 100) return { nHko: n, guaranteed: false };
  }
  return { nHko: Math.ceil(100 / maxPct), guaranteed: false };
}

export function runCalc(
  attackerSlot: NonNullable<TeamSlot>,
  attackerSide: 'you' | 'opp',
  defenderSlot: NonNullable<TeamSlot>,
  moves: string[],
  cond: Conditions,
): CalcMoveResult[] {
  let attacker: Pokemon;
  let defender: Pokemon;
  try {
    attacker = buildCalcPokemon(attackerSlot);
    defender = buildCalcPokemon(defenderSlot);
  } catch {
    return [];
  }

  const field = buildCalcField(cond, attackerSide);
  const results: CalcMoveResult[] = [];
  const defHp = defender.stats.hp;

  for (const moveName of moves) {
    try {
      const move = new Move(GEN, moveName);
      const result = calculate(GEN, attacker, defender, move, field);
      const [min, max] = result.range();
      if (min === 0 && max === 0) continue; // status move

      const minPct = (min / defHp) * 100;
      const maxPct = (max / defHp) * 100;
      const { nHko, guaranteed } = nHkoFromPct(minPct, maxPct);

      results.push({
        moveName,
        minPct,
        maxPct,
        nHko,
        guaranteed,
        desc: result.fullDesc(),
      });
    } catch {
      // Move not in calc data or unsupported — skip
    }
  }

  results.sort((a, b) => b.maxPct - a.maxPct);
  return results;
}

export function getMovesForSlot(
  slot: NonNullable<TeamSlot>,
  smogonMoves: Record<string, string[]>,
  champMovesFull: Record<string, Array<{ name: string; pct: number }>>,
): string[] {
  // Prefer actual imported moveset
  if (slot.moves?.length) return slot.moves;
  // Champions format full move list (top 8)
  const champMoves = champMovesFull[slot.entry.id];
  if (champMoves?.length) return champMoves.slice(0, 8).map(m => m.name);
  // Smogon usage top 4
  const smogMoves = smogonMoves[slot.entry.id];
  if (smogMoves?.length) return smogMoves;
  return [];
}
