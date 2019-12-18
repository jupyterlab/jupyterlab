/**
 * Example story for styling an icon.
 */
// need this to avoid
// TS2686: 'React' refers to a UMD global, but the current file is a module.
import React from 'react';

import { DefaultIconReact } from '../src';

import '@jupyterlab/application/style/index.css';
import '@jupyterlab/theme-light-extension/style/index.css';

export default {
  component: DefaultIconReact,
  title: 'IconReact'
};

export const buildIcon = () => <DefaultIconReact name={'build'} />;

export const html5Icon = () => (
  <div className={'foobar'}>
    <DefaultIconReact name={'html5'} kind={'launcherSection'} center={true} />
  </div>
);
