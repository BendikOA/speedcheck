import { CHAMPIONS_ROSTER } from '$lib/championsRoster';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
  return { championsIds: [...CHAMPIONS_ROSTER] };
};
