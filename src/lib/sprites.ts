import { Sprites, Icons } from '@pkmn/img';

export function spriteUrl(name: string): string {
  return Sprites.getPokemon(name).url;
}

export function iconStyle(name: string): string {
  return Icons.getPokemon(name).style;
}
