import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';

function styleTokens() {
  function build() {
    execSync('node_modules/.bin/style-dictionary build --config style-dictionary.config.js', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  }

  return {
    name: 'style-tokens',
    buildStart() {
      build();
    },
    configureServer(server: any) {
      server.watcher.add('src/styles/tokens/**/*.json');
      server.watcher.on('change', (file: string) => {
        if (file.endsWith('.json') && file.includes('tokens')) {
          build();
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [styleTokens(), sveltekit()],
  ssr: {
    noExternal: ['bits-ui'],
  },
});
