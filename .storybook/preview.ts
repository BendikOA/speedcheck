import type { Preview } from '@storybook/sveltekit';
import '../src/app.scss';

// Let Storybook's background addon control the canvas background
const sbStyle = document.createElement('style');
sbStyle.textContent = 'html, body { background: transparent !important; }';
document.head.appendChild(sbStyle);

const preview: Preview = {
  decorators: [
    (story) => {
      document.documentElement.setAttribute('data-theme', 'dark');
      return story();
    },
  ],
  parameters: {
    backgrounds: {
      default: 'bg',
      values: [
        { name: 'bg',   value: '#dddcdc' },
        { name: 'dark', value: '#0c0b0b' },
      ],
    },
    layout: 'centered',
  },
};

export default preview;
