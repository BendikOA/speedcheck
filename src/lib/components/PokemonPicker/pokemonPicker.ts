import { writable, derived } from 'svelte/store';
import type { SpeedEntry } from '$lib/speedtiers';

export const search = writable('');

export const entriesStore = writable<SpeedEntry[]>([]);

export const featuredStore = writable<SpeedEntry[]>([]);

export const excludeStore = writable<string[]>([]);

export const excludeSet = derived(excludeStore, $exclude => new Set($exclude));

export const available = derived([entriesStore, excludeSet], ([$entries, $excludeSet]) => $entries.filter(e => !$excludeSet.has(e.id)));

export const filtered = derived([search, available, featuredStore, excludeSet], ([$search, $available, $featured, $excludeSet]) => {
  if ($search.length < 1) {
    if ($featured.length > 0) {
      return $featured.filter(e => !$excludeSet.has(e.id)).slice(0, 100);
    } else {
      return $available.slice(0, 100);
    }
  } else {
    return $available.filter(e => e.name.toLowerCase().includes($search.toLowerCase())).slice(0, 100);
  }
});

export function pick(dispatch: any, entry: SpeedEntry) {
  dispatch('pick', entry);
}

export function onKeydown(dispatch: any, e: KeyboardEvent) {
  if (e.key === 'Escape') dispatch('close');
}