import { writable, derived } from 'svelte/store';

export const items = writable<string[]>([]);

export const value = writable<string>('');

export const placeholder = writable<string>('Search…');

export const id = writable<string | undefined>(undefined);

export const inputValue = writable<string>('');

export const filtered = derived([inputValue, items], ([$inputValue, $items]) =>
  $inputValue.length < 2
    ? []
    : $items
        .filter((item) =>
          item.toLowerCase().includes($inputValue.toLowerCase())
        )
        .slice(0, 10)
);

export function onValueChange(dispatch: any, v: string) {
  if (v) dispatch("select", v);
}

export function onOpenChangeComplete(dispatch: any, open: boolean, inputValue: string) {
  if (!open) dispatch("input", inputValue);
}