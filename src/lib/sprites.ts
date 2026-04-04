import { Sprites } from '@pkmn/img';

export function spriteUrl(name: string): string {
  return Sprites.getPokemon(name).url;
}
