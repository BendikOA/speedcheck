import type { Meta, StoryObj } from '@storybook/sveltekit';
import PasteModal from '$lib/components/ui/PasteModal/index.svelte';

const meta = {
  title: 'UI/PasteModal',
  component: PasteModal,
  argTypes: {
    open: { control: 'boolean' },
    loading: { control: 'boolean' },
    error: { control: 'text' },
    placeholder: { control: 'text' },
    showCancel: { control: 'boolean' },
  },
} satisfies Meta<PasteModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    open: true,
    loading: false,
    error: '',
    placeholder: 'Paste a pokepast.es URL or raw Showdown export here…',
    showCancel: true,
  },
};

export const Loading: Story = {
  args: { open: true, loading: true, error: '', showCancel: true },
};

export const WithError: Story = {
  args: {
    open: true,
    loading: false,
    error: 'No matching Pokémon found — check the paste.',
    showCancel: true,
  },
};

export const Closed: Story = {
  args: { open: false, loading: false, error: '', showCancel: true },
};
