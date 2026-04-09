import { writable, derived } from 'svelte/store';
import type { SpeedEntry } from '$lib/speedtiers';

export const search = writable('');

export const entriesStore = writable<SpeedEntry[]>([]);

export const featuredStore = writable<SpeedEntry[]>([]);

export const excludeStore = writable<string[]>([]);

export const excludeSet = derived(excludeStore, $exclude => new Set($exclude));

export const available = derived([entriesStore, excludeSet], ([$entries, $excludeSet]) => $entries.filter(e => !$excludeSet.has(e.id)));

export const filtered = derived([search, available, featuredStore, excludeSet], ([$search, $available, $featured, $excludeSet]) => {
  let results;
  if ($search.length < 1) {
    if ($featured.length > 0) {
      results = $featured.filter(e => !$excludeSet.has(e.id)).slice(0, 100);
    } else {
      results = $available.slice(0, 100);
    }
  } else {
    results = $available.filter(e => e.name.toLowerCase().includes($search.toLowerCase())).slice(0, 100);
  }

  // Sort by relevance: starts with search first, then alphabetically
  if ($search.length > 0) {
    results.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith($search.toLowerCase());
      const bStarts = b.name.toLowerCase().startsWith($search.toLowerCase());
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  return results;
});

export function pick(dispatch: any, entry: SpeedEntry) {
  search.set('');
  dispatch('pick', entry);
}

export function onKeydown(dispatch: any, e: KeyboardEvent) {
  if (e.key === 'Escape') {
    search.set('');
    dispatch('close');
  }
}