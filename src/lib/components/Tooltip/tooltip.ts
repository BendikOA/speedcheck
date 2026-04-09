import { derived } from 'svelte/store';
import { tooltipStore } from '$lib/tooltip';

export const t = tooltipStore;

export const left = derived(t, $t => Math.max(8, Math.min($t.x - 8, (typeof window !== 'undefined' ? window.innerWidth : 400) - 220)));

export const top = derived(t, $t => $t.y - 8);