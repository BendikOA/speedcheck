import type { SpeedEntry, NatureTier } from '$lib/speedtiers';
import type { TeamSlot } from '$lib/stores/teams';

const SPEED_POS = new Set(['timid', 'jolly', 'naive', 'hasty']);
const SPEED_NEG = new Set(['brave', 'quiet', 'relaxed', 'sassy']);

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Extract Pokémon name from first line of a Showdown block, handling nickname format. */
function parseName(firstLine: string): { name: string; item: string } {
  let raw = firstLine;
  let item = '';

  if (raw.includes('@')) {
    const atIdx = raw.indexOf('@');
    item = raw.slice(atIdx + 1).trim();
    raw  = raw.slice(0, atIdx).trim();
  }

  // Strip gender marker "(M)" / "(F)" at end
  raw = raw.replace(/\s+\([MF]\)\s*$/, '').trim();

  // Nickname format: "Nickname (SpeciesName)"
  const nicknameMatch = raw.match(/\(([^)]+)\)\s*$/);
  if (nicknameMatch) {
    raw = nicknameMatch[1].trim();
  }

  return { name: raw, item };
}

/** Parse raw Showdown-format paste text into up to 6 TeamSlots. */
export function parsePaste(text: string, entries: SpeedEntry[]): TeamSlot[] {
  const byName = new Map(entries.map(e => [e.name.toLowerCase(), e]));
  const byId   = new Map(entries.map(e => [e.id, e]));

  function findEntry(name: string): SpeedEntry | undefined {
    return byName.get(name.toLowerCase()) ?? byId.get(toId(name));
  }

  const slots: TeamSlot[] = [];
  const blocks = text.trim().split(/\n\s*\n+/).filter(b => b.trim());

  for (const block of blocks) {
    if (slots.length >= 6) break;
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const { name: rawName, item } = parseName(lines[0]);
    const entry = findEntry(rawName);
    if (!entry) continue;

    const scarf = toId(item) === 'choicescarf';

    let nature: NatureTier = '=';
    for (const line of lines) {
      const m = line.match(/^(\w+)\s+Nature\b/i);
      if (m) {
        const nat = m[1].toLowerCase();
        nature = SPEED_POS.has(nat) ? '+' : SPEED_NEG.has(nat) ? '-' : '=';
        break;
      }
    }

    slots.push({ entry, scarf, nature });
  }

  // Pad to 6 nulls
  while (slots.length < 6) slots.push(null);
  return slots as TeamSlot[];
}

/** Fetch paste text from a pokepast.es URL or return raw text as-is. */
export async function resolvePaste(input: string): Promise<string> {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/pokepast\.es\/([a-zA-Z0-9]+)/i);
  if (urlMatch) {
    const resp = await fetch(`https://pokepast.es/${urlMatch[1]}/json`);
    if (!resp.ok) throw new Error(`Pokepaste fetch failed: ${resp.status}`);
    const data = await resp.json();
    return data.paste as string;
  }
  return trimmed;
}
