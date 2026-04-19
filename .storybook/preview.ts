import type { Preview } from '@storybook/sveltekit';
import '../src/app.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark',  value: '#07090e' },
        { name: 'panel', value: '#0e1120' },
      ],
    },
    layout: 'centered',
  },
};

export default preview;
