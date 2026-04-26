import type { Meta, StoryObj } from '@storybook/sveltekit';
import Navbar from '$lib/components/ui/Navbar/index.svelte';

const meta = {
  title: 'UI/Navbar',
  component: Navbar,
} satisfies Meta<Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
