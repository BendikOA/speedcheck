import { Dex } from '@pkmn/dex';

/** Short description of an ability from the dex. */
export function abilityDesc(name: string): string {
  const ab = Dex.abilities.get(name);
  return ab?.exists ? (ab.shortDesc || ab.desc || '') : '';
}

/** One-line move summary: "Normal / Physical · Power: 40 · Acc: 100%" */
export function moveSummary(name: string): string {
  const move = Dex.moves.get(name);
  if (!move?.exists) return '';
  const parts: string[] = [`${move.type} / ${move.category}`];
  if (move.basePower > 0) parts.push(`Power: ${move.basePower}`);
  if (move.accuracy === true) parts.push('Acc: —');
  else if (typeof move.accuracy === 'number') parts.push(`Acc: ${move.accuracy}%`);
  return parts.join(' · ');
}
