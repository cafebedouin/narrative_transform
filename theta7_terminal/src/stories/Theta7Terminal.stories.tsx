import type { Meta, StoryObj } from '@storybook/react';
import Theta7Terminal from '../components/theta7_terminal';

const meta: Meta<typeof Theta7Terminal> = {
  title: 'Terminals/Theta7',
  component: Theta7Terminal,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Theta7Terminal>;

export const Default: Story = {};
