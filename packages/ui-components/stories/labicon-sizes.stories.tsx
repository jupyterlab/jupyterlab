/**
 * Example story for styling an icon's size.
 */
// need this to avoid
// TS2686: 'React' refers to a UMD global, but the current file is a module.
import React from 'react';

import { clearIcon } from '../src';

import '@jupyterlab/application/style/index.css';
import '@jupyterlab/theme-light-extension/style/index.css';

export default {
  // component: LabIcon,
  title: 'LabIcon sizing'
};

export const clearSmall = () => <clearIcon.react elementSize="small" />;
export const clearNormal = () => <clearIcon.react elementSize="normal" />;
export const clearLarge = () => <clearIcon.react elementSize="large" />;
export const clearXlarge = () => <clearIcon.react elementSize="xlarge" />;
