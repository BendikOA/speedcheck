import { Pokemon, Move, Field, Side, calculate, Generations } from '@smogon/calc';
import type { TeamSlot } from '$lib/stores/teams';
import type { Conditions } from '$lib/speedtiers';
import type { PokemonSet } from '$lib/smogonUsage';
import { SUN_SETTING_ABILITIES } from '$lib/speedtiers';

export interface CalcMoveResult {
  moveName: string;
  moveType: string;
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

export interface CalcFieldMods {
  helpingHand?: boolean;
  reflect?: boolean;
  lightScreen?: boolean;
  auroraVeil?: boolean;
  friendGuard?: boolean;
  attackerBoosts?: Partial<{ atk: number; def: number; spa: number; spd: number; spe: number }>;
  defenderBoosts?: Partial<{ atk: number; def: number; spa: number; spd: number; spe: number }>;
}

const GEN = Generations.get(9);

function buildCalcField(cond: Conditions, attackerSide: 'you' | 'opp', mods?: CalcFieldMods): Field {
  const weather =
    cond.rain ? 'Rain' :
    cond.sun  ? 'Sun'  :
    cond.sand ? 'Sand' :
    cond.snow ? 'Snow' : undefined;
  const terrain =
    cond.electric ? 'Electric' :
    cond.grassy   ? 'Grassy'   :
    cond.psychic  ? 'Psychic'  : undefined;

  const atkSide = new Side({
    isTailwind:    attackerSide === 'you' ? !!cond.yourTailwind : !!cond.oppTailwind,
    isHelpingHand: !!mods?.helpingHand,
  });
  const defSide = new Side({
    isTailwind:    attackerSide === 'you' ? !!cond.oppTailwind : !!cond.yourTailwind,
    isReflect:     !!mods?.reflect,
    isLightScreen: !!mods?.lightScreen,
    isAuroraVeil:  !!mods?.auroraVeil,
    isFriendGuard: !!mods?.friendGuard,
  });

  return new Field({
    gameType: 'Doubles',
    weather: weather as any,
    terrain: terrain as any,
    attackerSide: atkSide,
    defenderSide: defSide,
  });
}

function buildCalcPokemon(
  slot: NonNullable<TeamSlot>,
  boosts?: Partial<{ atk: number; def: number; spa: number; spd: number; spe: number }>,
): Pokemon {
  const level = slot.level ?? 50;
  // EVs are stored in Champions scale (0-32); multiply ×8 for @smogon/calc (0-252 scale)
  const evs = slot.evs
    ? { hp: (slot.evs.hp ?? 0) * 8, atk: (slot.evs.atk ?? 0) * 8, def: (slot.evs.def ?? 0) * 8,
        spa: (slot.evs.spa ?? 0) * 8, spd: (slot.evs.spd ?? 0) * 8, spe: (slot.evs.spe ?? 0) * 8 }
    : undefined;
  const ivs = slot.ivs
    ? { hp: slot.ivs.hp, atk: slot.ivs.atk, def: slot.ivs.def, spa: slot.ivs.spa, spd: slot.ivs.spd, spe: slot.ivs.spe }
    : undefined;

  return new Pokemon(GEN, slot.entry.name, {
    level,
    nature:   (slot.natureName ?? 'Serious') as any,
    item:     (slot.item     ?? undefined) as any,
    ability:  (slot.ability  ?? slot.entry.abilities[0] ?? undefined) as any,
    teraType: (slot.teraType ?? undefined) as any,
    evs,
    ivs,
    boosts:   boosts as any,
  });
}

/** Returns the computed final stats for a slot (EVs expected in Champions 0-32 scale). */
export function getCalcStats(slot: NonNullable<TeamSlot>): Record<string, number> {
  try { return buildCalcPokemon(slot).stats as unknown as Record<string, number>; }
  catch { return {}; }
}

/**
 * Returns a copy of `slot` with empty fields filled in from `set`.
 * Imported data always takes priority. Set EVs are in traditional (0-252) scale.
 */
export function mergeSet(slot: NonNullable<TeamSlot>, set: PokemonSet): NonNullable<TeamSlot> {
  const hasEvs = slot.evs && Object.values(slot.evs).some(v => v > 0);
  return {
    ...slot,
    evs:        hasEvs ? slot.evs : (set.evs as any),
    natureName: slot.natureName ?? set.nature,
    item:       slot.item       ?? set.item,
    ability:    slot.ability    ?? set.ability,
    moves:      slot.moves?.length ? slot.moves : set.moves,
  };
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
  mods?: CalcFieldMods,
): CalcMoveResult[] {
  let attacker: Pokemon;
  let defender: Pokemon;
  try {
    attacker = buildCalcPokemon(attackerSlot, mods?.attackerBoosts);
    defender = buildCalcPokemon(defenderSlot, mods?.defenderBoosts);
  } catch {
    return [];
  }

  // If the attacker has a sun-setting ability (e.g. Mega Sol on Mega Meganium),
  // treat the field as sunny so Weather Ball is correctly typed as Fire.
  // When holding a mega stone, the mega form's ability overrides the base ability.
  const megaFormAbility = attackerSlot.item
    ? attackerSlot.entry.megaForms.find(m => m.megaStone === attackerSlot.item)?.ability
    : undefined;
  const attackerAbilityId = (megaFormAbility ?? attackerSlot.ability ?? attackerSlot.entry.abilities[0] ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const condWithAbilityWeather: Conditions =
    SUN_SETTING_ABILITIES.has(attackerAbilityId) && !cond.rain && !cond.sun && !cond.sand && !cond.snow
      ? { ...cond, sun: true }
      : cond;

  const field = buildCalcField(condWithAbilityWeather, attackerSide, mods);
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
        moveType: (result.move as any).type ?? move.type ?? 'Normal',
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
