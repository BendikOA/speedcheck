import { Sprites, Icons } from '@pkmn/img';

export function spriteUrl(name: string): string {
  return Sprites.getPokemon(name).url;
}

export function staticSpriteUrl(name: string): string {
  return Sprites.getPokemon(name, { gen: 'gen5' }).url;
}

/**
 * Returns an inline style string for a held item icon (24×24 sprite sheet).
 */
export function itemIconStyle(name: string): string {
  const raw = Icons.getItem(name).style;
  const match = raw.match(/background:transparent url\(([^)]+)\) no-repeat scroll (-?\d+px -?\d+px)/);
  if (match) {
    const [, url, pos] = match;
    return `display:inline-block;width:24px;height:24px;image-rendering:pixelated;background-image:url(${url});background-repeat:no-repeat;background-position:${pos};`;
  }
  return raw;
}

const PS_SHEET = 'https://play.pokemonshowdown.com/sprites/pokemonicons-sheet.png';
const LOCAL_SHEET = '/pokemonicons-sheet.png';

/**
 * Returns an inline style string for a Pokemon icon.
 * Uses a locally pinned sprite sheet so positions never drift when PS updates theirs.
 * Also uses explicit longhand properties instead of the `background` shorthand to
 * avoid browser inconsistencies with the `scroll` attachment keyword.
 */
export function iconStyle(name: string): string {
  const raw = Icons.getPokemon(name).style;
  // Replace live PS URL with our pinned local copy
  const pinned = raw.replace(PS_SHEET, LOCAL_SHEET);
  // Rewrite background shorthand into explicit properties to avoid `scroll` parsing quirks:
  // "background:transparent url(...) no-repeat scroll Xpx Ypx"
  // → "background-image:url(...);background-repeat:no-repeat;background-position:Xpx Ypx"
  const match = pinned.match(/background:transparent url\(([^)]+)\) no-repeat scroll (-?\d+px -?\d+px)/);
  if (match) {
    const [, url, pos] = match;
    return pinned.replace(
      /background:[^;]+;/,
      `background-image:url(${url});background-repeat:no-repeat;background-position:${pos};`
    );
  }
  return pinned;
}
