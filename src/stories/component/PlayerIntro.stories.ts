import type { Meta, StoryObj } from '@storybook/sveltekit';
import PlayerIntro from '$lib/components/ui/PlayerIntro/index.svelte';

const meta = {
  title: 'UI/PlayerIntro',
  component: PlayerIntro,
  argTypes: {
    step:  { control: 'text' },
    title: { control: 'text' },
  },
} satisfies Meta<PlayerIntro>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { step: 'Step 1/2', title: 'Select Pokemon' },
};

export const NoStep: Story = {
  name: 'Title only',
  args: { title: 'Select Pokemon' },
};
