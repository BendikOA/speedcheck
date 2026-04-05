import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { GenNumber, NatureTier } from '$lib/speedtiers';
import type { StatSpread } from '$lib/stores/teams';

const STORAGE_KEY = 'vgc-saved-teams';

export interface SavedTeamSlot {
  id:            string;
  name:          string;
  scarf:         boolean;
  nature:        NatureTier;
  natureLocked?: boolean;
  item?:         string;
  ability?:      string;
  teraType?:     string;
  level?:        number;
  evs?:          StatSpread;
  ivs?:          StatSpread;
  moves?:        string[];
  nickname?:     string;
}

export interface SavedTeam {
  id: string;
  label: string;
  genNum: GenNumber;
  yourTeam: (SavedTeamSlot | null)[];
  savedAt: number;
  wins:   number;
  losses: number;
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
  const { subscribe, update, set } = writable<SavedTeam[]>([]);

  // Hydrate from localStorage as soon as we're on the client.
  // Using `if (browser)` here covers both initial page load and hard reloads.
  if (browser) {
    set(load());
  }

  return {
    subscribe,
    init() {
      set(load());
    },
    save(team: Omit<SavedTeam, 'id' | 'savedAt' | 'wins' | 'losses'>) {
      const entry: SavedTeam = {
        ...team,
        id: crypto.randomUUID(),
        savedAt: Date.now(),
        wins: 0,
        losses: 0,
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
    resetRecord(id: string) {
      update(teams => {
        const next = teams.map(t => t.id === id ? { ...t, wins: 0, losses: 0, recordHistory: [] } : t);
        persist(next);
        return next;
      });
    },
    recordResult(id: string, result: 'win' | 'loss') {
      update(teams => {
        const next = teams.map(t => t.id === id
          ? { ...t, wins: t.wins + (result === 'win' ? 1 : 0), losses: t.losses + (result === 'loss' ? 1 : 0) }
          : t);
        persist(next);
        return next;
      });
    },
    updateTeam(id: string, data: Partial<Pick<SavedTeam, 'label' | 'genNum' | 'yourTeam'>>) {
      const now = Date.now();
      update(teams => {
        const next = teams.map(t => {
          if (t.id !== id) return t;
          return { ...t, ...data, savedAt: now, wins: 0, losses: 0 };
        });
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
