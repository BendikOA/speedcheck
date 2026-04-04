import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { GenNumber } from '$lib/speedtiers';

const STORAGE_KEY = 'vgc-saved-teams';

export interface SavedTeamSlot {
  id: string;
  name: string;
  scarf: boolean;
}

export interface SavedTeam {
  id: string;
  label: string;
  genNum: GenNumber;
  yourTeam: (SavedTeamSlot | null)[];
  savedAt: number;
}

function load(): SavedTeam[] {
  if (!browser) return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function persist(teams: SavedTeam[]) {
  if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

function createStore() {
  const { subscribe, update, set } = writable<SavedTeam[]>(load());

  return {
    subscribe,
    init() {
      set(load());
    },
    save(team: Omit<SavedTeam, 'id' | 'savedAt'>) {
      const entry: SavedTeam = {
        ...team,
        id: crypto.randomUUID(),
        savedAt: Date.now(),
      };
      update(teams => {
        const next = [entry, ...teams];
        persist(next);
        return next;
      });
      return entry.id;
    },
    rename(id: string, label: string) {
      update(teams => {
        const next = teams.map(t => t.id === id ? { ...t, label } : t);
        persist(next);
        return next;
      });
    },
    remove(id: string) {
      update(teams => {
        const next = teams.filter(t => t.id !== id);
        persist(next);
        return next;
      });
    },
  };
}

export const savedTeams = createStore();
