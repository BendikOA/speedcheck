import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  // Prevent browsers from caching HTML pages. Without this, after a new
  // Vercel deploy the browser serves stale HTML with old chunk hashes, which
  // causes 404s on dynamically-imported JS modules and a broken layout.
  // Hashed /_app/immutable/** assets are still cached immutably by the adapter.
  if (response.headers.get('content-type')?.includes('text/html')) {
    response.headers.set('cache-control', 'no-store');
  }

  return response;
};
