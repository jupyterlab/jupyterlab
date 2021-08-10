/**
 * Example story for styling a button.
 */
import '@jupyterlab/application/style/index.css';
import '@jupyterlab/theme-light-extension/style/index.css';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { Button } from '../src';

export default {
  // component: Button,
  title: 'Button'
};

export const text = () => (
  <Button onClick={action('clicked')}>Hello Button</Button>
);

export const emoji = () => (
  <Button onClick={action('clicked')}>
    <span role="img" aria-label="so cool">
      😀 😎 👍 💯
    </span>
  </Button>
);
