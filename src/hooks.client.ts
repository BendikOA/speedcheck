import type { HandleClientError } from '@sveltejs/kit';

const RELOAD_KEY = 'chunk-reload-attempted';

export const handleError: HandleClientError = ({ error }) => {
  // After a new deployment, cached HTML references old JS chunk hashes that no
  // longer exist on the server (404). SvelteKit surfaces this as a
  // "Failed to fetch dynamically imported module" TypeError. Force a hard
  // reload so the browser fetches fresh HTML with the correct chunk URLs.
  // sessionStorage guard prevents an infinite reload loop if the new deploy
  // is itself broken.
  if (
    error instanceof TypeError &&
    error.message.includes('Failed to fetch dynamically imported module')
  ) {
    if (!sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, '1');
      location.reload();
    }
    return;
  }
  // Clear the guard on any other error so a future chunk failure can retry.
  sessionStorage.removeItem(RELOAD_KEY);
};
